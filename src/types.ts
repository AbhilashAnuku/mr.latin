/**
 * Mr.Latin — shared types (the public contract).
 *
 * Mr.Latin is a LANGUAGE-only library: it translates the visible text of a page
 * into any language with a natural, conversational, locale-true tone. Theming
 * lives in its sibling library, TheSwitch.
 */

/** A BCP-47 language (or language-region) tag, e.g. "en", "de", "te", "te-IN". */
export type LanguageCode = string;

/** How the translation should *sound*. The headline feature. */
export type Tone =
  | "conversational" // natural, how a person actually speaks (default)
  | "warm" // friendly and inviting
  | "playful" // light, casual, fun
  | "neutral" // plain, informational
  | "formal"; // polite/professional

/** Social register — independent of tone. */
export type Register = "casual" | "neutral" | "formal";

/** dict[targetLang][sourceText] = exact, hand-authored translation/transcreation. */
export type Dictionary = Record<LanguageCode, Record<string, string>>;

/** Context that helps a provider translate a string the way a human would. */
export interface TranslateContext {
  /** Nearby text / the section heading this string sits under. */
  near?: string;
  /** The page title or a short description of the site/section. */
  page?: string;
  /** A hint about what kind of element this is (e.g. "button", "heading"). */
  role?: string;
}

/** One translation request — always batched, always with context. */
export interface TranslateRequest {
  texts: string[];
  from: LanguageCode;
  to: LanguageCode;
  tone: Tone;
  register: Register;
  /** Per-text context, aligned 1:1 with `texts` (entries may be undefined). */
  contexts?: (TranslateContext | undefined)[];
  /** Brand/term glossary that must be honoured verbatim. */
  glossary?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * A translation provider. Implementations resolve a batch of source strings
 * into the target language. The engine tries providers in order and uses the
 * first one that reports itself available for the language pair.
 */
export interface TranslationProvider {
  readonly name: string;
  isAvailable(from: LanguageCode, to: LanguageCode): boolean | Promise<boolean>;
  /** Must return one string per input text, in the same order. */
  translate(req: TranslateRequest): Promise<string[]>;
}

/** A user-suggested better phrasing — the inline feedback loop. */
export interface Suggestion {
  source: string;
  language: LanguageCode;
  current: string;
  suggested: string;
}

export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface WidgetOptions {
  position?: WidgetPosition;
  /** Show the language picker (default true). */
  language?: boolean;
}

export interface MrLatinOptions {
  /** Page's authored language; "auto" reads <html lang> / detects. */
  sourceLanguage?: LanguageCode | "auto";
  /** Initial display language (defaults to persisted, else source). */
  language?: LanguageCode;
  /** Languages offered in the picker. */
  languages?: LanguageCode[];
  /** Ordered provider chain. Defaults to a sensible on-device-first chain. */
  providers?: TranslationProvider[];
  /** Exact overrides (brand names, legal copy, perfect-tone phrases). */
  dictionary?: Dictionary;
  /** Brand/term glossary honoured verbatim by providers. */
  glossary?: Record<string, string>;
  /** How translations should sound. Default "conversational". */
  tone?: Tone;
  /** Social register. Default "casual". */
  register?: Register;
  /** Translate dynamically-added DOM (default true). */
  autoTranslate?: boolean;
  /** Remember the chosen language in localStorage (default true). */
  persist?: boolean;
  /** Floating control (default true). */
  widget?: boolean | WidgetOptions;
  /** CSS selectors whose subtrees are never translated. */
  skipSelectors?: string[];
  /** Root to scan/observe (default document.body). */
  root?: HTMLElement;
  /** Called when a user suggests a better phrasing via the widget. */
  onSuggest?: (suggestion: Suggestion) => void;

  // --- Default provider-chain configuration (all optional) ---------------
  // These are consumed only when `providers` is not supplied, to assemble
  // Mr.Latin's built-in chain. They never bake a key into the bundle.
  /**
   * A translation endpoint you control. Used by the LLM provider (as a proxy
   * that holds the API key) or, if no LLM is configured, by the plain HTTP
   * provider. Recommended for production.
   */
  endpoint?: string;
  /** Endpoint of a self-hosted LibreTranslate instance (cross-browser fallback). */
  libreEndpoint?: string;
  /** Direct LLM mode (dev/prototyping only): which API shape to speak. */
  vendor?: "anthropic" | "openai";
  /** Direct LLM mode only: API key. NEVER ship this to real users — use `endpoint`. */
  apiKey?: string;
  /** LLM model id (defaults chosen by the provider per vendor). */
  model?: string;
  /** Allow direct in-browser LLM calls in dev (sends the vendor CORS opt-in). */
  allowBrowser?: boolean;
}
