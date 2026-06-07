import type {
  Dictionary,
  LanguageCode,
  Register,
  Tone,
  TranslateContext,
  TranslationProvider,
} from "../types";
import type { TranslationCache } from "./cache";
import type { TextUnit } from "./scanner";
import { setWriteSuppressed } from "./scanner";

/**
 * The translator turns scanned {@link TextUnit}s into translated DOM.
 *
 * Resolution order, per unique source string:
 *   1. `dictionary[to][source]` — exact, hand-authored overrides win.
 *   2. `cache.get(...)`         — anything translated before (in-memory + LS).
 *   3. the first available provider in the chain, batched with context.
 *
 * Successful provider results are cached. Any gap falls back to the source
 * string, so the page is never left with blanks. Writes go in via `textContent`
 * / `setAttribute` only (never `innerHTML`) and are bracketed with the
 * scanner's write-suppression flag so the MutationObserver ignores them. A new
 * run aborts the previous one.
 */
export interface TranslatorOptions {
  providers: TranslationProvider[];
  cache: TranslationCache;
  dictionary?: Dictionary;
  glossary?: Record<string, string>;
  tone: Tone;
  register: Register;
  onBusy?: (busy: boolean) => void;
}

/** Roughly how many strings to send a provider per request. */
const CHUNK_SIZE = 50;

export class Translator {
  private providers: TranslationProvider[];
  private cache: TranslationCache;
  private dictionary?: Dictionary;
  private glossary?: Record<string, string>;
  private tone: Tone;
  private register: Register;
  private onBusy?: (busy: boolean) => void;

  /** The in-flight run's controller; a new run aborts it. */
  private controller: AbortController | null = null;

  constructor(opts: TranslatorOptions) {
    this.providers = opts.providers;
    this.cache = opts.cache;
    this.dictionary = opts.dictionary;
    this.glossary = opts.glossary;
    this.tone = opts.tone;
    this.register = opts.register;
    this.onBusy = opts.onBusy;
  }

  /** Abort any in-flight translation run. */
  abort(): void {
    this.controller?.abort();
    this.controller = null;
  }

  /**
   * Translate the given units from → to and apply the results to the DOM.
   *
   * `units` is grouped by source string (as produced by `scan`): the key is the
   * source text and the value every place it appears. A no-op when `from === to`.
   */
  async translateUnits(
    units: Map<string, TextUnit[]>,
    from: LanguageCode,
    to: LanguageCode,
    signal?: AbortSignal,
  ): Promise<void> {
    if (units.size === 0) return;
    if (from === to) return;

    // A new run supersedes the previous one.
    this.abort();
    const controller = new AbortController();
    this.controller = controller;
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
    const runSignal = controller.signal;

    const sources = Array.from(units.keys());
    const resolved = new Map<string, string>();
    const dict = this.dictionary?.[to];

    // 1) Dictionary + 2) cache resolve synchronously; collect the rest.
    const missing: string[] = [];
    for (const source of sources) {
      const exact = dict?.[source];
      if (exact != null) {
        resolved.set(source, exact);
        continue;
      }
      const cached = this.cache.get({
        source,
        to,
        tone: this.tone,
        register: this.register,
      });
      if (cached != null) {
        resolved.set(source, cached);
        continue;
      }
      missing.push(source);
    }

    // 3) Provider chain for whatever is left.
    if (missing.length > 0 && !runSignal.aborted) {
      const provider = await this.pickProvider(from, to);
      if (provider && !runSignal.aborted) {
        this.setBusy(true);
        try {
          await this.translateViaProvider(
            provider,
            missing,
            units,
            from,
            to,
            resolved,
            runSignal,
          );
        } catch (err) {
          if (isAbort(err)) return;
          // Provider failure: leave the gaps to fall back to source below.
        } finally {
          this.setBusy(false);
        }
      }
    }

    if (runSignal.aborted) return;

    // Apply: translated where we have it, source text otherwise.
    setWriteSuppressed(true);
    try {
      for (const [source, list] of units) {
        const text = resolved.get(source) ?? source;
        for (const unit of list) applyUnit(unit, text);
      }
    } finally {
      setWriteSuppressed(false);
    }

    if (this.controller === controller) this.controller = null;
  }

  /** First provider that reports itself available for the language pair. */
  private async pickProvider(
    from: LanguageCode,
    to: LanguageCode,
  ): Promise<TranslationProvider | undefined> {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable(from, to)) return provider;
      } catch {
        /* treat as unavailable, try the next */
      }
    }
    return undefined;
  }

  /** Batch the missing strings through one provider and cache successes. */
  private async translateViaProvider(
    provider: TranslationProvider,
    missing: string[],
    units: Map<string, TextUnit[]>,
    from: LanguageCode,
    to: LanguageCode,
    resolved: Map<string, string>,
    signal: AbortSignal,
  ): Promise<void> {
    for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
      if (signal.aborted) return;
      const chunk = missing.slice(i, i + CHUNK_SIZE);
      const contexts: (TranslateContext | undefined)[] = chunk.map(
        (source) => units.get(source)?.[0]?.context,
      );

      const out = await provider.translate({
        texts: chunk,
        from,
        to,
        tone: this.tone,
        register: this.register,
        contexts,
        glossary: this.glossary,
        signal,
      });

      for (let j = 0; j < chunk.length; j++) {
        const source = chunk[j]!;
        const value = out[j];
        // Only accept a non-empty result distinct enough to be a translation.
        if (value != null && value !== "") {
          resolved.set(source, value);
          this.cache.set(
            { source, to, tone: this.tone, register: this.register },
            value,
          );
        }
      }
    }
  }

  private setBusy(busy: boolean): void {
    try {
      this.onBusy?.(busy);
    } catch {
      /* never let a busy listener break translation */
    }
  }
}

/** Write a translated string onto a unit's node — text or attribute only. */
function applyUnit(unit: TextUnit, text: string): void {
  if (unit.kind === "attr" && unit.attr) {
    const el = unit.node as Element;
    // Guard against the node having been detached or the attr removed.
    if (el.getAttribute(unit.attr) != null || unit.attr === "value") {
      el.setAttribute(unit.attr, text);
    }
    return;
  }
  // Text node: preserve the surrounding whitespace of the original value so
  // inline layout (leading/trailing spaces between elements) is not lost.
  const raw = unit.node.nodeValue ?? "";
  const leading = /^\s*/.exec(raw)?.[0] ?? "";
  const trailing = /\s*$/.exec(raw)?.[0] ?? "";
  unit.node.textContent = leading + text + trailing;
}

function isAbort(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === "AbortError"
  ) ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "AbortError");
}
