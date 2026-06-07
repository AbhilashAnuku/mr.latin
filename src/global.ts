/**
 * Mr.Latin — IIFE / `<script>` entry point.
 *
 * Drop one tag on a page and the whole site speaks the visitor's language:
 *
 * ```html
 * <script
 *   src="https://unpkg.com/mr.latin/dist/mr-latin.global.js"
 *   data-mr-latin
 *   data-languages="en,de,te,ar"
 *   data-tone="warm"
 * ></script>
 * ```
 *
 * On load this finds its own `<script data-mr-latin>` element, reads the
 * `data-*` configuration, constructs the engine and starts it. It also exposes
 * `MrLatin` as the global/default export so the same bundle can be used
 * programmatically.
 */

import MrLatin from "./core/mr-latin";
import type {
  LanguageCode,
  MrLatinOptions,
  Register,
  Tone,
  WidgetOptions,
  WidgetPosition,
} from "./types";

/**
 * Auto-init configuration. Extends the published options with the two endpoint
 * shortcuts the `<script>` tag understands (`data-endpoint` enables the LLM
 * transcreation tier; `data-libre-endpoint` points at a LibreTranslate server).
 * Declared locally so this entry compiles independently of how the core adds
 * those fields, while staying assignable to {@link MrLatinOptions}.
 */
interface AutoInitOptions extends MrLatinOptions {
  /** Proxy endpoint for the LLM transcreation provider. */
  endpoint?: string;
  /** LibreTranslate server endpoint. */
  libreEndpoint?: string;
}

/** Split a comma-separated attribute into a clean, non-empty list. */
function splitList(value: string | null): string[] | undefined {
  if (value == null) return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length > 0 ? items : undefined;
}

/** A data-* boolean where only the literal string "false" turns it off. */
function isFalse(value: string | null): boolean {
  return value === "false";
}

/** Find the script element that opted in via `data-mr-latin`. */
function findScript(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const current = document.currentScript as HTMLElement | null;
  if (current && current.hasAttribute("data-mr-latin")) return current;
  return document.querySelector<HTMLElement>("script[data-mr-latin]");
}

/** Build engine options from a script element's `data-*` attributes. */
function optionsFromScript(el: HTMLElement): AutoInitOptions {
  const get = (name: string): string | null => el.getAttribute(name);
  const opts: AutoInitOptions = {};

  const sourceLanguage = get("data-source-language");
  if (sourceLanguage) {
    opts.sourceLanguage = sourceLanguage as LanguageCode | "auto";
  }

  const language = get("data-language");
  if (language) opts.language = language;

  const languages = splitList(get("data-languages"));
  if (languages) opts.languages = languages;

  const tone = get("data-tone");
  if (tone) opts.tone = tone as Tone;

  const register = get("data-register");
  if (register) opts.register = register as Register;

  // `data-endpoint` enables the LLM transcreation tier.
  const endpoint = get("data-endpoint");
  if (endpoint) opts.endpoint = endpoint;

  const libreEndpoint = get("data-libre-endpoint");
  if (libreEndpoint) opts.libreEndpoint = libreEndpoint;

  // Booleans: present and not "false" → true; "false" → false; absent → default.
  if (el.hasAttribute("data-persist")) {
    opts.persist = !isFalse(get("data-persist"));
  }
  if (el.hasAttribute("data-auto-translate")) {
    opts.autoTranslate = !isFalse(get("data-auto-translate"));
  }

  const skipSelectors = splitList(get("data-skip"));
  if (skipSelectors) opts.skipSelectors = skipSelectors;

  // Widget: explicit "false" disables it; a position implies an enabled widget.
  const widgetDisabled = el.hasAttribute("data-widget") && isFalse(get("data-widget"));
  const position = get("data-position");
  if (widgetDisabled) {
    opts.widget = false;
  } else if (position) {
    const widget: WidgetOptions = { position: position as WidgetPosition };
    opts.widget = widget;
  }

  return opts;
}

/** Run a callback once the document body is ready to be scanned. */
function whenReady(run: () => void): void {
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

// Auto-init: only when a `data-mr-latin` script tag is present.
const script = findScript();
if (script) {
  const options = optionsFromScript(script);
  whenReady(() => {
    new MrLatin(options).start();
  });
}

export default MrLatin;
