# Changelog

All notable changes to Mr.Latin are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-06

Mr.Latin is now a **language-only** library. Theming has moved to the sibling
library, TheSwitch.

### Added

- **Translation engine** (from scratch, zero runtime deps): DOM scanner
  (text nodes + `placeholder`/`title`/`alt`/`aria-label`), `MutationObserver`
  for dynamically-added content, dedupe + batching, canonical-source registry,
  and layered resolution: dictionary → cache → provider.
- **Two-tier translation cache** (in-memory `Map` + `localStorage`), keyed by
  language + tone + register so conversational and formal variants never collide.
- **Providers**:
  - on-device `BrowserTranslationProvider` (Chromium Translator API — free,
    private, zero-config Tier 1),
  - vendor-neutral `createHttpProvider`,
  - self-hostable `createLibreTranslateProvider`,
  - and the new **conversational LLM provider** `createLLMProvider` —
    transcreation that honours tone, register, locale and glossary instead of
    translating word-for-word (Tier 2), with `buildTranscreationPrompt` exported
    so proxies can reuse the exact prompt.
- **Flag-tile widget**: a Shadow-DOM-isolated language picker rendered as a grid
  of flag tiles labelled in each language's native name, with keyboard
  navigation, ARIA roles + `aria-live` status, a loading state, and
  `prefers-reduced-motion` support.
- **RTL** support (Arabic, Hebrew, Persian, Urdu, …) and `Intl` formatting
  helpers (numbers, currency, dates, native language names).
- **Framework adapters**: React (`mr.latin/react`), Vue (`mr.latin/vue`), and
  Svelte (`mr.latin/svelte`); vanilla core stays framework-agnostic.
- **Drop-in** IIFE build with `data-*` auto-init (`data-mr-latin`,
  `data-source-language`, `data-languages`, `data-tone`, `data-register`,
  `data-endpoint`); programmatic API alongside.
- **Hardened production build**: minified, comment-free, no public source map;
  optional obfuscation via `npm run build:hidden`.
- Persistence of the chosen language, and an inline `onSuggest` feedback hook.
- Test suite (Vitest + jsdom) and CI.

[Unreleased]: https://example.com/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/releases/tag/v0.1.0
