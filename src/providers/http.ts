import type { TranslateRequest, TranslationProvider } from "../types";

/**
 * A generic HTTP translation provider — point it at any endpoint that speaks the
 * same JSON shape as Mr.Latin's LLM proxy mode (see `callProxy` in ./llm.ts).
 *
 * Your server receives the full request (texts, language pair, tone, register,
 * per-text context and glossary) and returns the finished translations. This
 * keeps any API keys on the server, never in the browser. Mr.Latin makes no
 * network calls except to the endpoint you configure here.
 */
export interface HttpProviderOptions {
  /** Endpoint to POST translation requests to. Required to be usable. */
  endpoint: string;
  /** Extra request headers (e.g. auth for your proxy). */
  headers?: Record<string, string>;
  /** HTTP method to use. Defaults to "POST". */
  method?: string;
}

/**
 * Build a `TranslationProvider` that POSTs each batch to `opts.endpoint`.
 *
 * Request body (JSON):
 * `{ texts, from, to, tone, register, contexts, glossary }`.
 *
 * Response: either `{ translations: string[] }` or a bare `string[]`. The result
 * is aligned 1:1 with the input; any missing entry falls back to its source text.
 */
export function createHttpProvider(
  opts: HttpProviderOptions,
): TranslationProvider {
  const method = opts.method ?? "POST";

  return {
    name: "http",
    isAvailable() {
      return Boolean(opts.endpoint);
    },
    async translate(req: TranslateRequest): Promise<string[]> {
      if (req.texts.length === 0) return [];

      const res = await fetch(opts.endpoint, {
        method,
        headers: { "content-type": "application/json", ...opts.headers },
        body: JSON.stringify({
          texts: req.texts,
          from: req.from,
          to: req.to,
          tone: req.tone,
          register: req.register,
          contexts: req.contexts,
          glossary: req.glossary,
        }),
        signal: req.signal,
      });
      if (!res.ok) throw new Error(`http provider ${res.status}`);

      const data: unknown = await res.json();
      const out = toStringArray(data);

      // Never return a wrong-length array: fall back to source for any gap.
      return req.texts.map((t, i) => out[i] ?? t);
    },
  };
}

/** Accept `{ translations: string[] }` or a bare `string[]`. */
function toStringArray(data: unknown): string[] {
  const raw =
    data && typeof data === "object" && "translations" in data
      ? (data as { translations: unknown }).translations
      : data;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x : String(x)));
}
