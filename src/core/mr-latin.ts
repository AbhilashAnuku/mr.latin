import type {
  LanguageCode,
  MrLatinOptions,
  Register,
  Suggestion,
  Tone,
  TranslationProvider,
} from "../types";
import { TranslationCache } from "./cache";
import { Translator } from "./translator";
import {
  clearCanonical,
  observe,
  scan,
  setSkipSelectors,
  setWriteSuppressed,
  type TextUnit,
} from "./scanner";
import { applyDirection } from "../intl/rtl";
import { createWidget, type WidgetDeps, type WidgetHandle } from "../ui/widget";
import {
  BrowserTranslationProvider,
} from "../providers/browser";
import { createHttpProvider } from "../providers/http";
import { createLibreTranslateProvider } from "../providers/libretranslate";
import { createLLMProvider } from "../providers/llm";

/** Library version, surfaced as a static for diagnostics. */
const VERSION = "0.1.0";

/** localStorage key for the user's chosen language. */
const LANGUAGE_STORAGE_KEY = "mr.latin:v1:language";

/** A sensible default set of languages for the picker. */
const DEFAULT_LANGUAGES: LanguageCode[] = [
  "en",
  "es",
  "fr",
  "de",
  "ar",
  "zh",
  "ja",
  "hi",
];

/**
 * The engine. Point it at a page and it translates the visible text into the
 * chosen language with a natural, conversational tone — scanning the DOM,
 * resolving each string through dictionary → cache → a provider chain, mirroring
 * the layout for RTL languages, mounting an accessible widget, and keeping
 * dynamically-added content translated via a MutationObserver.
 */
export class MrLatin {
  /** The page's authored language. */
  readonly sourceLanguage: LanguageCode;
  /** The language currently being displayed. */
  language: LanguageCode;
  readonly tone: Tone;
  readonly register: Register;

  private readonly options: MrLatinOptions;
  private readonly root: HTMLElement;
  private readonly languages: LanguageCode[];
  private readonly providers: TranslationProvider[];
  private readonly cache: TranslationCache;
  private readonly translator: Translator;
  private readonly persist: boolean;

  private widget: WidgetHandle | null = null;
  private disconnectObserver: (() => void) | null = null;
  private started = false;
  private _busy = false;
  private readonly listeners = new Set<() => void>();

  constructor(options: MrLatinOptions = {}) {
    this.options = options;
    this.root =
      options.root ??
      (typeof document !== "undefined" ? document.body : (undefined as never));

    this.sourceLanguage = resolveSourceLanguage(options.sourceLanguage);
    this.tone = options.tone ?? "conversational";
    this.register = options.register ?? "casual";
    this.persist = options.persist !== false;

    this.language = resolveInitialLanguage(
      options.language,
      this.sourceLanguage,
      this.persist,
    );

    this.languages = uniqueLanguages([
      ...(options.languages ?? DEFAULT_LANGUAGES),
      this.sourceLanguage,
      this.language,
    ]);

    this.cache = new TranslationCache(this.persist);
    this.providers = options.providers ?? this.defaultProviders(options);

    setSkipSelectors(options.skipSelectors);

    this.translator = new Translator({
      providers: this.providers,
      cache: this.cache,
      dictionary: options.dictionary,
      glossary: options.glossary,
      tone: this.tone,
      register: this.register,
      onBusy: (busy) => this.setBusy(busy),
    });
  }

  /**
   * Mr.Latin's built-in provider chain, assembled from the configured options.
   * Never bakes a key into the bundle — direct LLM mode requires the caller to
   * pass `vendor` + `apiKey` explicitly (dev only).
   */
  private defaultProviders(opts: MrLatinOptions): TranslationProvider[] {
    const chain: TranslationProvider[] = [];
    const hasLLM = Boolean(opts.endpoint || (opts.vendor && opts.apiKey));

    if (hasLLM) {
      chain.push(
        createLLMProvider({
          endpoint: opts.endpoint,
          vendor: opts.vendor,
          apiKey: opts.apiKey,
          model: opts.model,
          allowBrowser: opts.allowBrowser,
        }),
      );
    }

    // On-device, free, private — always in the chain.
    chain.push(new BrowserTranslationProvider());

    // A plain HTTP fallback only when an endpoint is given and not already used
    // by the LLM provider above.
    if (opts.endpoint && !hasLLM) {
      chain.push(createHttpProvider({ endpoint: opts.endpoint }));
    }

    // A self-hosted LibreTranslate instance, when configured.
    if (opts.libreEndpoint) {
      chain.push(
        createLibreTranslateProvider({ endpoint: opts.libreEndpoint }),
      );
    }

    return chain;
  }

  /**
   * Scan, translate, mirror layout, mount the widget, and (unless disabled)
   * start observing for dynamically-added content. Idempotent.
   */
  async start(): Promise<this> {
    if (this.started) return this;
    this.started = true;

    applyDirection(this.language);
    await this.translateRoot();
    this.mountWidget();

    if (this.options.autoTranslate !== false) this.startObserver();

    return this;
  }

  /**
   * Switch the display language: persist it, abort any in-flight run, mirror the
   * layout, re-scan + translate, and update the widget.
   */
  async setLanguage(code: LanguageCode): Promise<void> {
    if (code === this.language) return;
    this.language = code;
    this.storeLanguage(code);
    this.notify();
    this.translator.abort();

    applyDirection(code);
    this.widget?.setLanguage(code);
    await this.translateRoot();
  }

  /** Re-scan and re-translate the current root (e.g. after a big DOM change). */
  async refresh(): Promise<void> {
    await this.translateRoot();
  }

  /** Tear everything down and revert the page to its source language. */
  destroy(): void {
    this.disconnectObserver?.();
    this.disconnectObserver = null;
    this.translator.abort();
    this.widget?.destroy();
    this.widget = null;

    // Restore the original source text everywhere we changed it. `scan` returns
    // each unit's canonical (pre-translation) source as `unit.original`, so we
    // simply write that back, then forget the recorded originals.
    if (this.root && this.language !== this.sourceLanguage) {
      const units = scan(this.root);
      setWriteSuppressed(true);
      try {
        for (const [, list] of units) {
          for (const unit of list) revertUnit(unit);
        }
      } finally {
        setWriteSuppressed(false);
      }
    }
    clearCanonical();

    this.language = this.sourceLanguage;
    applyDirection(this.sourceLanguage);
    this.started = false;
  }

  /** Whether a translation run is currently in flight. */
  get busy(): boolean {
    return this._busy;
  }

  /**
   * Subscribe to engine state changes (language / busy). Returns an unsubscribe
   * function. Used by the framework adapters to mirror engine state.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private setBusy(busy: boolean): void {
    this._busy = busy;
    this.widget?.setBusy(busy);
    this.notify();
  }

  // --- internals -----------------------------------------------------------

  private async translateRoot(): Promise<void> {
    if (!this.root) return;
    if (this.language === this.sourceLanguage) return;
    const units = scan(this.root);
    await this.translator.translateUnits(
      units,
      this.sourceLanguage,
      this.language,
    );
  }

  private startObserver(): void {
    if (!this.root || this.disconnectObserver) return;
    this.disconnectObserver = observe(this.root, (roots) => {
      void this.translateNodes(roots);
    });
  }

  private async translateNodes(roots: Node[]): Promise<void> {
    if (this.language === this.sourceLanguage) return;
    const merged = new Map<string, TextUnit[]>();
    for (const node of roots) {
      const units = scan(node);
      for (const [source, list] of units) {
        const existing = merged.get(source);
        if (existing) existing.push(...list);
        else merged.set(source, list.slice());
      }
    }
    if (merged.size === 0) return;
    await this.translator.translateUnits(
      merged,
      this.sourceLanguage,
      this.language,
    );
  }

  private mountWidget(): void {
    if (this.options.widget === false) return;
    if (typeof document === "undefined") return;

    const widgetOptions =
      typeof this.options.widget === "object" ? this.options.widget : undefined;

    const deps: WidgetDeps & { onSuggest?: (s: Suggestion) => void } = {
      languages: this.languages,
      currentLanguage: this.language,
      onLanguage: (code) => {
        void this.setLanguage(code);
      },
      options: widgetOptions,
    };
    if (this.options.onSuggest) deps.onSuggest = this.options.onSuggest;

    this.widget = createWidget(deps);
  }

  private storeLanguage(code: LanguageCode): void {
    if (!this.persist) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      /* quota / disabled — ignore */
    }
  }

  // --- statics -------------------------------------------------------------

  static readonly BrowserTranslationProvider = BrowserTranslationProvider;
  static readonly createLLMProvider = createLLMProvider;
  static readonly createHttpProvider = createHttpProvider;
  static readonly createLibreTranslateProvider = createLibreTranslateProvider;
  static readonly version = VERSION;
}

export default MrLatin;

// --- resolution helpers ----------------------------------------------------

function resolveSourceLanguage(
  source: MrLatinOptions["sourceLanguage"],
): LanguageCode {
  if (source && source !== "auto") return source;
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.getAttribute("lang")?.trim();
    if (htmlLang) return htmlLang;
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
}

function resolveInitialLanguage(
  explicit: LanguageCode | undefined,
  source: LanguageCode,
  persist: boolean,
): LanguageCode {
  if (persist) {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) return stored;
    } catch {
      /* ignore */
    }
  }
  if (explicit) return explicit;
  return source;
}

/** Write a unit's canonical source back onto its node (text/attr only). */
function revertUnit(unit: TextUnit): void {
  if (unit.kind === "attr" && unit.attr) {
    (unit.node as Element).setAttribute(unit.attr, unit.original);
    return;
  }
  const raw = unit.node.nodeValue ?? "";
  const leading = /^\s*/.exec(raw)?.[0] ?? "";
  const trailing = /\s*$/.exec(raw)?.[0] ?? "";
  unit.node.textContent = leading + unit.original + trailing;
}

function uniqueLanguages(codes: LanguageCode[]): LanguageCode[] {
  const seen = new Set<string>();
  const out: LanguageCode[] = [];
  for (const code of codes) {
    if (code && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}
