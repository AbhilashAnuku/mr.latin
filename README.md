# Mr.Latin

> Mr.Latin speaks every language — naturally.

**Zero-config, zero-dependency, drop-in translation for any web page.** Add one
`<script>` tag (or one npm import) and an existing site starts speaking any
language — no string extraction, no JSON catalogs, no build step.

Mr.Latin is a **language-only** library. It reads the text that's already on the
page, translates it, and swaps it in — live, in place, RTL-aware. Want adaptive
light/dark theming too? That's a separate concern, handled by the sibling library
[TheSwitch](#theming-lives-in-theswitch).

Built **entirely from scratch**: the scan → dedupe → resolve → swap → cache
engine, the providers, the RTL handling, the `Intl` formatting, and the flag-tile
widget are all hand-written. **The shipped package has no runtime dependencies.**

---

## Why

Most i18n libraries make *you* do the work: extract every string, maintain a JSON
file per language, wire up a framework plugin, and re-deploy whenever the copy
changes. Mr.Latin flips it around — you point it at a page and it translates
what's already there. The text on screen *is* the source of truth.

It comes in two tiers. Pick the one that fits.

## Tier 1 — zero-config, on-device, free

Drop it in and you're done. With no endpoint and no key, Mr.Latin uses the
**browser's built-in, on-device Chromium Translator API**. Translation happens
**locally, on the visitor's machine** — nothing is sent to a server, nothing
costs you anything, and there's nothing to set up.

```html
<script
  src="https://cdn.jsdelivr.net/npm/mr.latin/dist/mr-latin.global.js"
  data-mr-latin
  data-source-language="de"
  data-languages="de,en,fr,es,ar,zh,ja"
></script>
```

That's the whole integration. A floating flag-tile picker appears, the visitor
taps a language, and the page re-speaks itself — for free, and privately.

```ts
import { MrLatin } from "mr.latin";

await new MrLatin({
  sourceLanguage: "auto", // reads <html lang> if you don't say
  language: "en",
}).start();
```

## Tier 2 — conversational transcreation (recommended for production)

On-device machine translation is great, but it's still *machine* translation. When
you want copy that sounds like a real person — honouring **tone**, **register**
and **local dialect** instead of translating word-for-word — point Mr.Latin at an
LLM proxy you control.

Set a single attribute (`data-endpoint`) or option (`endpoint`) and Mr.Latin
switches into **transcreation** mode. Your endpoint receives the strings (plus
context, tone, register and glossary) and returns natural phrasing. "Come join us"
becomes a warm, idiomatic invitation in the target language — not a literal gloss.

```html
<script
  src="https://cdn.jsdelivr.net/npm/mr.latin/dist/mr-latin.global.js"
  data-mr-latin
  data-source-language="de"
  data-languages="de,en,fr,es,ar,zh,ja"
  data-endpoint="/api/translate"
  data-tone="warm"
  data-register="casual"
></script>
```

```ts
import { MrLatin, createLLMProvider } from "mr.latin";

await new MrLatin({
  sourceLanguage: "de",
  language: "en",
  tone: "warm",
  register: "casual",
  providers: [
    // Your server holds the API key and calls the model. The key NEVER
    // ships to the browser.
    createLLMProvider({ endpoint: "/api/translate" }),
  ],
}).start();
```

**Claude is the recommended default.** It handles multilingual nuance, idiom and
register especially well, so transcreation reads the way a native speaker actually
talks. Mr.Latin is vendor-agnostic, though — any Anthropic- or OpenAI-compatible
endpoint works.

> **Your key stays on your server.** Mr.Latin never bakes in API keys and never
> calls a vendor directly in production. The browser POSTs to *your* endpoint;
> your endpoint adds the secret and calls the model. The library makes no network
> calls except to the providers/endpoints you explicitly configure.

Need the exact prompt your proxy should send? Import `buildTranscreationPrompt`
and reuse the very same system/user prompt the library would build:

```ts
import { buildTranscreationPrompt } from "mr.latin";
const { system, user } = buildTranscreationPrompt(req);
```

## The flag-tile picker

The built-in widget is a Shadow-DOM-isolated **flag-tile picker**: a grid of
flag tiles, each labelled with the language's name *in its own language* (so
French reads "Français", Telugu reads "తెలుగు"). The visitor taps a tile, the page
switches, and the choice is remembered. It's fully keyboard-navigable, carries
proper ARIA roles and an `aria-live` status, respects `prefers-reduced-motion`,
and lives entirely inside a shadow root so the host site's CSS can never clash
with it (and vice-versa).

```ts
await new MrLatin({
  widget: { position: "bottom-right" },
}).start();
```

Turn it off with `widget: false` if you'd rather drive language switching from
your own UI via `ml.setLanguage("ar")`.

## All languages

Mr.Latin isn't a fixed list. Any BCP-47 tag works — `"en"`, `"de"`, `"te"`,
`"te-IN"`, `"pt-BR"` — and the picker labels each one with its native name and a
flag automatically. Right-to-left scripts (Arabic, Hebrew, Persian, Urdu and
friends) mirror the layout correctly, and the bundled `Intl` helpers format
numbers, currency and dates for the active locale.

```ts
import { isRTL, formatCurrency, nativeLanguageName } from "mr.latin";

isRTL("ar");                       // true
nativeLanguageName("te");          // "తెలుగు"
formatCurrency(1299.5, "EUR", "de"); // "1.299,50 €"
```

## Install

### npm

```bash
npm install mr.latin
```

```ts
import { MrLatin } from "mr.latin";

const ml = await new MrLatin({
  sourceLanguage: "auto",
  language: "en",
  // Tier 2 (optional): a conversational endpoint you control.
  // providers: [createLLMProvider({ endpoint: "/api/translate" })],
  dictionary: { en: { "Anmelden": "Sign in" } }, // exact overrides win
}).start();

ml.setLanguage("ar"); // switches text + mirrors layout to RTL
```

### CDN script tag

No build step at all — drop in the global build and configure it with `data-*`
attributes. It auto-initializes on load.

```html
<script
  src="https://cdn.jsdelivr.net/npm/mr.latin/dist/mr-latin.global.js"
  data-mr-latin
  data-source-language="de"
  data-languages="de,en,fr,es,it,ar,fa,zh,ru,hi"
  data-tone="conversational"
  data-register="casual"
  data-endpoint="/api/translate"
></script>
```

Want to do it by hand instead? The global also exposes the API so you can build
your own config:

```html
<script src="https://cdn.jsdelivr.net/npm/mr.latin/dist/mr-latin.global.js"></script>
<script>
  new MrLatin({
    sourceLanguage: "de",
    languages: ["de", "en", "fr", "ar"],
    providers: [
      new MrLatin.BrowserTranslationProvider(),               // Tier 1: free, on-device
      MrLatin.createLLMProvider({ endpoint: "/api/translate" }) // Tier 2: conversational
    ],
  }).start();
</script>
```

### data-* attributes

| Attribute | Maps to | Example |
| --- | --- | --- |
| `data-mr-latin` | enables auto-init | (flag, no value) |
| `data-source-language` | `sourceLanguage` | `"de"`, `"auto"` |
| `data-language` | `language` | `"en"` |
| `data-languages` | `languages` (comma-separated) | `"de,en,fr,ar"` |
| `data-tone` | `tone` | `"warm"` |
| `data-register` | `register` | `"casual"` |
| `data-endpoint` | Tier 2 LLM proxy `endpoint` | `"/api/translate"` |

Opt any element out of translation with `translate="no"`, `class="notranslate"`,
or `data-mr-latin-skip`.

## Options

These map exactly to `MrLatinOptions`.

| Option | Default | Description |
| --- | --- | --- |
| `sourceLanguage` | `"auto"` | Page's authored language (`"auto"` reads `<html lang>` / detects). |
| `language` | persisted, else source | Initial display language. |
| `languages` | common set | Languages offered in the picker. |
| `providers` | on-device-first chain | Ordered translation provider chain. |
| `dictionary` | `{}` | Exact overrides: `dict[lang][sourceText] = exactTranslation`. |
| `glossary` | `{}` | Brand/term glossary honoured verbatim by providers. |
| `tone` | `"conversational"` | How translations should *sound*. |
| `register` | `"casual"` | Social register (`"casual"` \| `"neutral"` \| `"formal"`). |
| `autoTranslate` | `true` | Translate dynamically-added DOM (via `MutationObserver`). |
| `persist` | `true` | Remember the chosen language in `localStorage`. |
| `widget` | `true` | Floating flag-tile control (`false`, or `{ position, language }`). |
| `skipSelectors` | `[]` | CSS selectors whose subtrees are never translated. |
| `root` | `document.body` | Root element to scan and observe. |
| `onSuggest` | — | Called when a user suggests a better phrasing via the widget. |

## How translation resolves

1. **Dictionary** — exact, hand-authored overrides win first (brand names, legal
   copy, perfect-tone phrases).
2. **Cache** — previously translated strings return instantly (in-memory +
   `localStorage`, keyed by language + tone + register).
3. **Provider chain** — the first available provider translates the rest:
   - `BrowserTranslationProvider` — on-device, free, private (Tier 1).
   - `createLLMProvider({ endpoint })` — conversational transcreation (Tier 2).
   - `createHttpProvider` / `createLibreTranslateProvider` — other endpoints you
     run.

Identical strings are translated once and applied everywhere on the page; content
added after load is picked up automatically by a `MutationObserver`.

## Browser support

The free, on-device Tier 1 relies on the browser's built-in **Chromium
Translator API**, which today is only available in Chromium-based browsers (and
even there it may download a language model on first use). Everywhere else — and
whenever you want consistent, conversational output across *all* browsers — **Tier
2 is the cross-browser path**: configure an `endpoint` and Mr.Latin works the same
in every modern browser. The widget, RTL handling and `Intl` helpers work
everywhere regardless of tier.

## Theming lives in TheSwitch

Mr.Latin is intentionally language-only. For adaptive light/dark theming — design
tokens, a zero-config dark mode, and a theme toggle that pairs perfectly with the
flag-tile picker — use the sibling library **[TheSwitch](../TheSwitch)**. The two
are designed to sit side by side: Mr.Latin handles the words, TheSwitch handles
the light.

## License

[MIT](./LICENSE) © Abhilash
