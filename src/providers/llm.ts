import type {
  LanguageCode,
  TranslateRequest,
  TranslationProvider,
} from "../types";
import { nativeLanguageName } from "../intl/format";

/**
 * The conversational (transcreation) provider — Mr.Latin's headline feature.
 *
 * Instead of word-for-word translation, it asks an LLM to *re-speak* each string
 * the way a native speaker actually would, matching tone, register and local
 * dialect. "Come join us" → Telugu becomes a natural invitation, not a literal
 * gloss.
 *
 * Two ways to run it:
 *  - `endpoint`: POST to YOUR server, which holds the API key and calls the LLM
 *    (recommended for production — the key never touches the browser).
 *  - `vendor` + `apiKey`: call Anthropic/OpenAI directly (dev/prototyping only).
 *
 * Vendor-agnostic: any Anthropic- or OpenAI-compatible endpoint works. Default
 * target is Claude, which handles multilingual nuance especially well.
 */
export interface LLMProviderOptions {
  /** Your proxy endpoint. If set, direct vendor calls are not used. */
  endpoint?: string;
  /** Direct mode only: which API shape to speak. Default "anthropic". */
  vendor?: "anthropic" | "openai";
  /** Direct mode only: API key. NEVER ship this to real users — use `endpoint`. */
  apiKey?: string;
  /** Model id. Defaults: Claude Haiku (anthropic) / gpt-4o-mini (openai). */
  model?: string;
  /** Override the API base URL. */
  baseUrl?: string;
  /** Extra headers (auth for your proxy, etc.). */
  headers?: Record<string, string>;
  /** Per-language phrasing guidance, e.g. te → "colloquial spoken Telugu". */
  dialect?: Record<LanguageCode, string>;
  /** Allow direct browser calls in dev (sends the CORS opt-in header). */
  allowBrowser?: boolean;
}

const DEFAULT_MODELS = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
} as const;

/** Build the exact transcreation prompt. Exported so proxies can reuse it. */
export function buildTranscreationPrompt(req: TranslateRequest): {
  system: string;
  user: string;
} {
  const toName = nativeLanguageName(req.to);
  const fromName = nativeLanguageName(req.from);
  const system = [
    `You are an expert translator and transcreator for website UI text.`,
    `Translate each string from ${fromName} (${req.from}) into ${toName} (${req.to}).`,
    ``,
    `Make it sound like a NATIVE ${toName} speaker actually talking — natural,`,
    `idiomatic and ${req.tone}, at a ${req.register} register. Never word-for-word.`,
    `Recreate the MEANING and the EMOTIONAL intent; replace idioms with the`,
    `closest natural local equivalent rather than translating them literally.`,
    `Speak the way people really speak in that language and region.`,
    ``,
    `Hard rules:`,
    `- Keep UI text concise and appropriate to its role (a button stays short).`,
    `- Preserve EXACTLY, untranslated: placeholders ({{x}}, %s, {0}), HTML tags,`,
    `  &entities;, URLs, emails, numbers, and code.`,
    `- Do NOT translate brand names or any provided glossary term.`,
    `- Output ONLY a JSON array of strings — one per input, same order, no prose.`,
  ].join("\n");

  const items = req.texts.map((text, i) => {
    const ctx = req.contexts?.[i];
    const entry: Record<string, string> = { text };
    if (ctx?.near) entry.near = ctx.near;
    if (ctx?.page) entry.page = ctx.page;
    if (ctx?.role) entry.role = ctx.role;
    return entry;
  });

  const userParts: string[] = [];
  if (req.glossary && Object.keys(req.glossary).length) {
    userParts.push(
      `Glossary (keep these exact): ${JSON.stringify(req.glossary)}`,
    );
  }
  const dialectNote = (req as { _dialect?: string })._dialect;
  if (dialectNote) userParts.push(`Target variety: ${dialectNote}.`);
  userParts.push(
    `Translate these ${items.length} strings; "near"/"page"/"role" are context only, do not translate them:`,
  );
  userParts.push(JSON.stringify(items, null, 0));
  return { system, user: userParts.join("\n\n") };
}

export function createLLMProvider(
  options: LLMProviderOptions = {},
): TranslationProvider {
  const vendor = options.vendor ?? "anthropic";
  const model = options.model ?? DEFAULT_MODELS[vendor];

  return {
    name: "llm",
    isAvailable() {
      return Boolean(options.endpoint || options.apiKey);
    },
    async translate(req: TranslateRequest): Promise<string[]> {
      if (req.texts.length === 0) return [];

      // Attach any dialect hint for the prompt builder.
      const dialect = options.dialect?.[req.to] ?? options.dialect?.[primary(req.to)];
      const enriched = dialect ? { ...req, _dialect: dialect } : req;

      let raw: string;
      if (options.endpoint) {
        raw = await callProxy(options, enriched);
      } else {
        const { system, user } = buildTranscreationPrompt(enriched);
        raw =
          vendor === "openai"
            ? await callOpenAI(options, model, system, user, req.signal)
            : await callAnthropic(options, model, system, user, req.signal);
      }

      const out = parseStringArray(raw);
      // Never return a wrong-length array: fall back to source for any gap.
      return req.texts.map((t, i) => out[i] ?? t);
    },
  };
}

async function callProxy(
  options: LLMProviderOptions,
  req: TranslateRequest,
): Promise<string> {
  const res = await fetch(options.endpoint!, {
    method: "POST",
    headers: { "content-type": "application/json", ...options.headers },
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
  if (!res.ok) throw new Error(`llm proxy ${res.status}`);
  const data = await res.json();
  // Accept { translations: [...] } or a bare array.
  return JSON.stringify(data.translations ?? data);
}

async function callAnthropic(
  options: LLMProviderOptions,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<string> {
  const base = options.baseUrl ?? "https://api.anthropic.com";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": options.apiKey ?? "",
    "anthropic-version": "2023-06-01",
    ...options.headers,
  };
  if (options.allowBrowser) headers["anthropic-dangerous-direct-browser-access"] = "true";
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function callOpenAI(
  options: LLMProviderOptions,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<string> {
  const base = options.baseUrl ?? "https://api.openai.com";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.apiKey ?? ""}`,
      ...options.headers,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Pull a JSON array of strings out of a model response (tolerant of fences). */
function parseStringArray(raw: string): string[] {
  if (!raw) return [];
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  const slice = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;
  try {
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
  } catch {
    /* fall through */
  }
  return [];
}

function primary(code: LanguageCode): LanguageCode {
  return code.toLowerCase().split(/[-_]/)[0] ?? code;
}
