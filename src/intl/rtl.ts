import type { LanguageCode } from "../types";

/** Languages written right-to-left (by primary subtag). */
const RTL = new Set([
  "ar", // Arabic
  "he", // Hebrew
  "fa", // Persian
  "ur", // Urdu
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "yi", // Yiddish
  "dv", // Divehi
  "ckb", // Central Kurdish (Sorani)
  "arc", // Aramaic
]);

/** True if the language's script flows right-to-left. */
export function isRTL(code: LanguageCode): boolean {
  const primary = code.toLowerCase().split(/[-_]/)[0] ?? code.toLowerCase();
  return RTL.has(primary);
}

/** Set `dir`/`lang` on an element to match the language. */
export function applyDirection(
  code: LanguageCode,
  el: HTMLElement = document.documentElement,
): void {
  el.setAttribute("lang", code);
  el.setAttribute("dir", isRTL(code) ? "rtl" : "ltr");
}
