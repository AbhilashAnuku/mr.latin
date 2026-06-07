import type {
  LanguageCode,
  TranslateRequest,
  TranslationProvider,
} from "../types";

/**
 * LibreTranslate provider — a self-hostable, open-source machine-translation
 * engine (https://libretranslate.com). Good as a free, privacy-respecting
 * fallback when the on-device browser translator isn't available.
 *
 * Note: LibreTranslate is plain machine translation — it does not understand
 * tone, register, per-text context or glossary, so those fields are ignored at
 * this tier. Use the LLM provider for true transcreation.
 */
export interface LibreTranslateOptions {
  /** Base URL of the LibreTranslate server, e.g. "https://libretranslate.com". */
  endpoint: string;
  /** Optional API key for hosted/rate-limited instances. */
  apiKey?: string;
}

/** How many strings to send per request, to keep payloads reasonable. */
const BATCH_SIZE = 25;

/**
 * Build a `TranslationProvider` backed by a LibreTranslate server.
 *
 * Each string is sent to `endpoint + "/translate"` as
 * `{ q, source, target, format: "text" }` (plus `api_key` when configured),
 * using primary language subtags only (LibreTranslate speaks "en"/"de", not
 * "en-US"/"de-DE"). Requests are batched; any gap falls back to the source text.
 */
export function createLibreTranslateProvider(
  opts: LibreTranslateOptions,
): TranslationProvider {
  return {
    name: "libretranslate",
    isAvailable() {
      return Boolean(opts.endpoint);
    },
    async translate(req: TranslateRequest): Promise<string[]> {
      if (req.texts.length === 0) return [];

      const source = primary(req.from);
      const target = primary(req.to);
      if (source === target) return req.texts.slice();

      const url = joinUrl(opts.endpoint, "/translate");
      const out: string[] = [];

      for (let start = 0; start < req.texts.length; start += BATCH_SIZE) {
        const batch = req.texts.slice(start, start + BATCH_SIZE);
        const translated = await translateBatch(
          url,
          batch,
          source,
          target,
          opts.apiKey,
          req.signal,
        );
        for (let i = 0; i < batch.length; i++) {
          out.push(translated[i] ?? batch[i]!);
        }
      }

      return out;
    },
  };
}

async function translateBatch(
  url: string,
  texts: string[],
  source: LanguageCode,
  target: LanguageCode,
  apiKey: string | undefined,
  signal: AbortSignal | undefined,
): Promise<string[]> {
  // LibreTranslate's `q` accepts an array and returns a matching array.
  const body: Record<string, unknown> = {
    q: texts,
    source,
    target,
    format: "text",
  };
  if (apiKey) body.api_key = apiKey;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`libretranslate ${res.status}`);

  const data: unknown = await res.json();
  const translated =
    data && typeof data === "object" && "translatedText" in data
      ? (data as { translatedText: unknown }).translatedText
      : undefined;

  // `translatedText` is an array when `q` is an array, a string otherwise.
  if (Array.isArray(translated)) {
    return translated.map((x) => (typeof x === "string" ? x : String(x)));
  }
  if (typeof translated === "string") return [translated];
  return [];
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function primary(code: LanguageCode): LanguageCode {
  return code.toLowerCase().split(/[-_]/)[0] ?? code;
}
