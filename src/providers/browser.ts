import type {
  LanguageCode,
  TranslateRequest,
  TranslationProvider,
} from "../types";

/**
 * On-device translation via Chromium's built-in Translator API.
 *
 * This runs entirely on the user's machine — no network, no API key, full
 * privacy — using the browser's bundled translation models. It's the first
 * provider Mr.Latin tries: when a language pair is supported locally, nothing
 * ever leaves the device.
 *
 * The API has shipped under several shapes as it evolved; we feature-detect all
 * of them:
 *   - `globalThis.Translator`            (current, the standardized surface)
 *   - `self.translation.createTranslator` (earlier experimental Translation API)
 *   - `self.ai.translator`                (original origin-trial shape)
 *
 * Tone, register, per-text context and glossary are NOT honoured at this tier:
 * the on-device models do plain translation only. For true transcreation that
 * respects tone/register/context, use the LLM provider. Mr.Latin's engine
 * already falls through to later providers when this one reports unavailable.
 */

// ---------------------------------------------------------------------------
// Minimal structural types for the (still-evolving) Chromium translation API.
// Kept private; nothing here leaks into the library's public types.
// ---------------------------------------------------------------------------

type Availability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "no"
  | "readily"
  | "after-download";

interface DownloadProgressEvent {
  loaded: number;
}

interface CreateMonitor {
  addEventListener(
    type: "downloadprogress",
    listener: (e: DownloadProgressEvent) => void,
  ): void;
}

interface TranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (m: CreateMonitor) => void;
}

interface TranslatorInstance {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  ready?: Promise<void>;
  destroy?(): void;
}

interface TranslatorFactory {
  availability?(
    opts: { sourceLanguage: string; targetLanguage: string },
  ): Promise<Availability>;
  canTranslate?(
    opts: { sourceLanguage: string; targetLanguage: string },
  ): Promise<Availability>;
  create(opts: TranslatorCreateOptions): Promise<TranslatorInstance>;
  createTranslator?(opts: TranslatorCreateOptions): Promise<TranslatorInstance>;
}

/** How many texts to translate at once (the models are sequential anyway). */
const CONCURRENCY = 4;

/** Locate whichever shape of the Translator factory this browser exposes. */
function getFactory(): TranslatorFactory | undefined {
  const g = globalThis as unknown as {
    Translator?: unknown;
    translation?: unknown;
    ai?: { translator?: unknown };
  };

  // 1. Standardized global: `Translator.availability` / `Translator.create`.
  const std = g.Translator as Partial<TranslatorFactory> | undefined;
  if (std && typeof std.create === "function") {
    return std as TranslatorFactory;
  }

  // 2. Experimental Translation API: `self.translation`.
  const tr = g.translation as Partial<TranslatorFactory> | undefined;
  if (tr && typeof tr.createTranslator === "function") {
    const createTranslator = tr.createTranslator.bind(tr);
    return {
      availability: tr.availability ?? tr.canTranslate,
      canTranslate: tr.canTranslate,
      create: createTranslator,
      createTranslator,
    };
  }

  // 3. Origin-trial shape: `self.ai.translator`.
  const ai = g.ai?.translator as Partial<TranslatorFactory> | undefined;
  if (ai && typeof ai.create === "function") {
    return ai as TranslatorFactory;
  }

  return undefined;
}

/** Treat anything but an explicit "no/unavailable" as usable. */
function isUsable(a: Availability): boolean {
  return (
    a === "available" ||
    a === "downloadable" ||
    a === "downloading" ||
    a === "readily" ||
    a === "after-download"
  );
}

async function queryAvailability(
  factory: TranslatorFactory,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<Availability> {
  const probe = factory.availability ?? factory.canTranslate;
  if (typeof probe !== "function") {
    // No probe available — assume we can try; create() will reject if not.
    return "available";
  }
  try {
    return await probe.call(factory, { sourceLanguage, targetLanguage });
  } catch {
    return "unavailable";
  }
}

export class BrowserTranslationProvider implements TranslationProvider {
  readonly name = "browser";

  private readonly factory = getFactory();
  private readonly availabilityCache = new Map<string, boolean>();
  private readonly translators = new Map<string, Promise<TranslatorInstance>>();

  /** True if any shape of the on-device Translator API is present. */
  static isSupported(): boolean {
    return getFactory() !== undefined;
  }

  async isAvailable(
    from: LanguageCode,
    to: LanguageCode,
  ): Promise<boolean> {
    if (from === to) return false;
    if (!this.factory) return false;

    const key = pairKey(from, to);
    const cached = this.availabilityCache.get(key);
    if (cached !== undefined) return cached;

    let ok = false;
    try {
      const availability = await queryAvailability(this.factory, from, to);
      ok = isUsable(availability);
    } catch {
      // Never throw when the API misbehaves — just report unavailable.
      ok = false;
    }
    this.availabilityCache.set(key, ok);
    return ok;
  }

  async translate(req: TranslateRequest): Promise<string[]> {
    if (req.texts.length === 0) return [];
    if (req.from === req.to) return req.texts.slice();
    if (!this.factory) return req.texts.slice();

    let translator: TranslatorInstance;
    try {
      translator = await this.getTranslator(req.from, req.to, req.signal);
    } catch {
      // Couldn't build a translator (download failed, pair unsupported, …):
      // fall back to source text so the engine can move to the next provider.
      return req.texts.slice();
    }

    const results = new Array<string>(req.texts.length);

    // Light concurrency: a shared cursor feeds a handful of workers.
    let cursor = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        if (req.signal?.aborted) throw abortError();
        const i = cursor++;
        if (i >= req.texts.length) return;
        const source = req.texts[i]!;
        results[i] = await this.translateOne(translator, source, req.signal);
      }
    };

    const workerCount = Math.min(CONCURRENCY, req.texts.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return results;
  }

  /** Translate one string; map any failure or empty result back to source. */
  private async translateOne(
    translator: TranslatorInstance,
    source: string,
    signal?: AbortSignal,
  ): Promise<string> {
    if (source.trim() === "") return source;
    try {
      const out = await translator.translate(source, { signal });
      return out && out.length > 0 ? out : source;
    } catch (err) {
      if (isAbort(err)) throw err;
      return source;
    }
  }

  /** Create (and cache) exactly one translator per from->to pair. */
  private getTranslator(
    from: LanguageCode,
    to: LanguageCode,
    signal?: AbortSignal,
  ): Promise<TranslatorInstance> {
    const factory = this.factory!;
    const key = pairKey(from, to);
    let pending = this.translators.get(key);
    if (pending) return pending;

    pending = (async () => {
      const instance = await factory.create({
        sourceLanguage: from,
        targetLanguage: to,
        signal,
        // Surface first-use model download; we just need to await readiness.
        monitor: () => {
          /* progress events available here if a UI ever wants them */
        },
      });
      // First use may trigger an on-device model download — wait for it.
      if (instance.ready) await instance.ready;
      return instance;
    })();

    // Don't cache a rejected creation, so a later call can retry cleanly.
    pending.catch(() => {
      if (this.translators.get(key) === pending) {
        this.translators.delete(key);
      }
    });

    this.translators.set(key, pending);
    return pending;
  }
}

function pairKey(from: LanguageCode, to: LanguageCode): string {
  return `${from}->${to}`;
}

function abortError(): DOMException | Error {
  try {
    return new DOMException("Aborted", "AbortError");
  } catch {
    const e = new Error("Aborted");
    e.name = "AbortError";
    return e;
  }
}

function isAbort(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "AbortError"
  );
}
