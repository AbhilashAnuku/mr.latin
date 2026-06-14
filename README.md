# Mr.Latin

Drop-in translation for existing web pages.

Mr.Latin is a zero-dependency TypeScript library that scans the text already rendered on a page, translates it, and swaps the copy in place. It supports a free on-device browser translation path and an optional server-side LLM transcreation path for production-quality tone and phrasing.

## Why This Project Matters

Traditional i18n requires string extraction, translation files, framework plugins, and repeated redeploys. Mr.Latin explores a different path: treat the visible page as the source of truth and add translation as a lightweight browser layer.

For recruiters and reviewers, this project shows:

- TypeScript library architecture with a small public API
- DOM scanning, deduplication, caching, mutation observation, and text replacement
- RTL-aware UI behavior and `Intl` formatting helpers
- Shadow DOM widget design
- Optional provider architecture for browser translation or server-side LLM endpoints
- Framework-agnostic core with React, Vue, and Svelte adapters
- CI, packaging, npm release workflow, and zero runtime dependencies

## Features

- Drop-in CDN integration with `data-*` attributes
- npm package API for application code
- On-device browser translation path where supported
- Optional LLM proxy provider for tone-aware transcreation
- Dictionary and glossary overrides for brand terms and exact phrases
- Cache layer for repeated strings
- Dynamic content handling with `MutationObserver`
- RTL language support
- Native language labels in the picker
- Optional React, Vue, and Svelte adapters

## Tech Stack

- TypeScript
- tsup
- Vitest
- jsdom
- GitHub Actions
- Browser translation APIs
- Optional LLM-compatible server endpoints

## Quick Start

### CDN

```html
<script
  src="https://cdn.jsdelivr.net/npm/mr.latin/dist/mr-latin.global.js"
  data-mr-latin
  data-source-language="auto"
  data-languages="en,de,fr,es,ar,zh,ja"
></script>
```

### npm

```bash
npm install mr.latin
```

```ts
import { MrLatin } from "mr.latin";

await new MrLatin({
  sourceLanguage: "auto",
  language: "en",
  dictionary: {
    en: {
      "Anmelden": "Sign in",
    },
  },
}).start();
```

## Provider Model

Mr.Latin resolves translation in layers:

1. Dictionary overrides for exact, hand-authored terms
2. Local cache for repeated strings
3. Provider chain for remaining text

The provider chain can use browser translation where available or a server endpoint you control.

```ts
import { MrLatin, createLLMProvider } from "mr.latin";

await new MrLatin({
  sourceLanguage: "de",
  language: "en",
  tone: "warm",
  register: "casual",
  providers: [
    createLLMProvider({ endpoint: "/api/translate" }),
  ],
}).start();
```

API keys should stay on the server. The browser calls your endpoint; your endpoint calls the model.

## Architecture

```text
src/
  core/          scan, dedupe, cache, swap, observe
  providers/     browser, HTTP, LLM-compatible providers
  widget/        Shadow DOM language picker
  intl/          locale, RTL, currency/date helpers
  react/         React adapter
  vue/           Vue adapter
  svelte/        Svelte adapter
```

The shipped package has no runtime dependencies. Framework integrations are optional adapters over the same core.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run pack:dry
```

## Quality Signals

- CI verifies typecheck, test, build, and package dry-run
- Release workflow supports npm provenance
- MIT licensed
- No runtime dependency surface

## Related Project

Mr.Latin pairs with [TheSwitch](https://github.com/AbhilashAnuku/TheSwitch), an adaptive theming library. Mr.Latin handles language; TheSwitch handles atmosphere-aware presentation.

## License

[MIT](./LICENSE) © Abhilash Anuku
