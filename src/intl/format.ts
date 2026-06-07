import type { LanguageCode } from "../types";

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/**
 * The language's name *in that language* — e.g. "de" → "Deutsch",
 * "te" → "తెలుగు", "ar" → "العربية". Falls back to the code if unsupported.
 */
export function nativeLanguageName(code: LanguageCode): string {
  try {
    const dn = new Intl.DisplayNames([code], { type: "language" });
    return capitalize(dn.of(code) ?? code);
  } catch {
    return code;
  }
}

/** The language's name in the current display language. */
export function languageNameIn(
  code: LanguageCode,
  displayLanguage: LanguageCode,
): string {
  try {
    const dn = new Intl.DisplayNames([displayLanguage], { type: "language" });
    return capitalize(dn.of(code) ?? code);
  } catch {
    return code;
  }
}

export function formatNumber(
  value: number,
  locale: LanguageCode,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: LanguageCode,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    value,
  );
}

export function formatDate(
  value: Date | number,
  locale: LanguageCode,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}
