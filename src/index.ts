/**
 * Mr.Latin — public entry point (the "." export).
 *
 * A zero-config, zero-dependency drop-in that translates the visible text of any
 * web page into any language with a natural, conversational, locale-true tone.
 *
 * This barrel re-exports the engine, every public type, the provider chain,
 * the intl/RTL helpers, the translation cache and the flag lookup so consumers
 * can pull everything they need from a single import:
 *
 * ```ts
 * import MrLatin, { createLLMProvider, formatCurrency } from "mr.latin";
 * ```
 */

// The engine — available as both a named and the default export.
export { MrLatin } from "./core/mr-latin";
export { default } from "./core/mr-latin";

// Public contract: options, providers, tones, registers, suggestions, …
export * from "./types";

// Translation providers (the on-device-first chain) + prompt builder.
export {
  BrowserTranslationProvider,
  createHttpProvider,
  createLibreTranslateProvider,
  createLLMProvider,
  buildTranscreationPrompt,
} from "./providers";

// Locale-aware formatting + right-to-left helpers.
export {
  nativeLanguageName,
  languageNameIn,
  formatNumber,
  formatCurrency,
  formatDate,
} from "./intl/format";
export { isRTL, applyDirection } from "./intl/rtl";

// Two-tier (memory + localStorage) translation cache.
export { TranslationCache } from "./core/cache";

// Emoji flag for a language/region tag.
export { flagFor } from "./ui/flags";
