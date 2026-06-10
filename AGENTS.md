# AGENTS.md — Mr.Latin

Build &amp; verify (run in this folder):

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Ground rules:

- Zero runtime dependencies.
- Mr.Latin is **language only** — theming lives in the sibling library, TheSwitch.
- The public API (`src/index.ts`, adapters, `data-*` auto-init, CDN global) is a
  contract — keep it stable; all checks must pass before committing.
- No telemetry. Translation provider keys stay server-side, never in the bundle.

See `README.md` for usage.
