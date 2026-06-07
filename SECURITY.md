# Security Policy

## Reporting a vulnerability
Please report security issues **privately** — do not open a public issue. Use
GitHub's **"Report a vulnerability"** (Security → Advisories) on this repository,
or contact the maintainer directly. We'll acknowledge within a reasonable time
and keep you updated on the fix.

## What Mr.Latin guarantees
- **Zero runtime dependencies** — minimal supply-chain surface.
- **No telemetry, no phone-home.** The library only calls the providers /
  endpoints you explicitly configure.
- **Your API keys stay on your server.** The conversational (LLM) provider is
  designed to talk to a proxy *endpoint you control*; keys are never bundled or
  sent to the browser.
- **DOM-safe.** Text is written via `textContent` / `setAttribute`, never
  `innerHTML`; the widget is Shadow-DOM isolated and excluded from translation.

## Supported versions
The latest published minor (`0.1.x`) receives security fixes.
