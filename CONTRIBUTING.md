# Contributing to Mr.Latin

**Contributors welcome!** 🎉 Mr.Latin is a from-scratch, zero-dependency library,
and we keep it that way on purpose. Issues, ideas, docs, and PRs are all valued —
beginners included.

## Ground rules
- **Zero runtime dependencies.** `dependencies` in `package.json` stays empty.
  (React/Vue are *optional* peer deps for the adapters only.)
- **Language only.** Translation, RTL, Intl, the language picker. Theming lives in
  the sibling library, [TheSwitch](https://github.com/AbhilashAnuku/TheSwitch).
- **Public API is a contract.** Add before you change; deprecate before you
  remove. Breaking changes are a major version bump.
- **Privacy & security first.** No telemetry; no network except the providers a
  user configures; API keys stay server-side. See [SECURITY.md](./SECURITY.md).

## Getting started
```bash
npm install
npm run dev        # watch build
npm run typecheck
npm test
npm run build
```
Then serve the folder and open `demo/index.html` over http to try it live
(e.g. `npx http-server . -p 5001` → http://localhost:5001/demo/).

## Definition of done
A change is done only when **typecheck, test, and build all pass**. CI runs these
on Node 18/20/22 for every PR.

## Submitting a PR
1. Fork & branch from `main`.
2. Make the change *with tests*.
3. Run the full check suite above.
4. Open a PR using the template — be clear and kind.

By contributing, you agree your work is licensed under the project's
[MIT License](./LICENSE), and to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
