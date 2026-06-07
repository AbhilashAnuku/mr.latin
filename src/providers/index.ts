/**
 * Translation providers — the pluggable backends Mr.Latin's engine tries in
 * order, using the first one that reports itself available for a language pair.
 *
 * Privacy-first ordering is recommended: on-device `browser` first, then your
 * own `http`/`llm` proxy, with `libretranslate` as an open-source fallback.
 */

export {
  BrowserTranslationProvider,
} from "./browser";
export type { BrowserTranslationProvider as BrowserProvider } from "./browser";

export { createHttpProvider } from "./http";
export type { HttpProviderOptions } from "./http";

export { createLibreTranslateProvider } from "./libretranslate";
export type { LibreTranslateOptions } from "./libretranslate";

export { createLLMProvider, buildTranscreationPrompt } from "./llm";
export type { LLMProviderOptions } from "./llm";
