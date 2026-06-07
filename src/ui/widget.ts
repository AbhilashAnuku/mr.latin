import type { LanguageCode, Suggestion, WidgetOptions } from "../types";
import { nativeLanguageName } from "../intl/format";
import { flagFor } from "./flags";

/**
 * Everything the floating widget needs from the engine. The widget is a pure
 * view: it never translates, persists or fetches — it just surfaces the current
 * language, lets the user pick another, and (optionally) lets them suggest a
 * better phrasing.
 */
export interface WidgetDeps {
  languages: LanguageCode[];
  currentLanguage: LanguageCode;
  onLanguage: (code: LanguageCode) => void;
  onSuggest?: (suggestion: Suggestion) => void;
  options?: WidgetOptions;
}

/** Imperative handle the engine keeps to drive the widget after creation. */
export interface WidgetHandle {
  setLanguage(code: LanguageCode): void;
  setBusy(busy: boolean): void;
  destroy(): void;
}

/**
 * A Shadow-DOM, flag-tile LANGUAGE picker (language only — theming lives in the
 * sibling library).
 *
 * Collapsed it's a single button showing the current flag and code. Expanded it
 * opens a listbox of rectangular flag tiles — each a tiny schematic SVG drawn by
 * `flagFor`, with the active language enlarged. It's fully keyboard-driven
 * (Arrow/Enter/Space/Escape, roving tabindex, focus trap), announces changes via
 * an aria-live region, and a subtle shine animates on hover/press — disabled
 * entirely under `prefers-reduced-motion`. While a switch is in flight it shows a
 * spinner and slows its animations.
 *
 * Rendered in a Shadow DOM so the host page's CSS can never clash with ours, and
 * the host element carries `data-mr-latin-skip` so the translation engine never
 * translates its own controls.
 */
export function createWidget(deps: WidgetDeps): WidgetHandle {
  const position = deps.options?.position ?? "bottom-right";

  const host = document.createElement("mr-latin-widget");
  host.setAttribute("data-mr-latin-skip", "");
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = WIDGET_CSS;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = `ml-wrap ml-${position}`;

  let currentLanguage = deps.currentLanguage;
  let expanded = false;
  let onSuggest = deps.onSuggest;

  // --- Collapsed toggle button ---------------------------------------------
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ml-toggle";
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", "false");

  const toggleFlag = document.createElement("span");
  toggleFlag.className = "ml-flag ml-flag-current";
  toggleFlag.setAttribute("aria-hidden", "true");

  const toggleCode = document.createElement("span");
  toggleCode.className = "ml-code";

  const spinner = document.createElement("span");
  spinner.className = "ml-spinner";
  spinner.setAttribute("aria-hidden", "true");
  spinner.hidden = true;

  toggle.append(toggleFlag, toggleCode, spinner);

  // --- Expanded panel ------------------------------------------------------
  const panel = document.createElement("div");
  panel.className = "ml-panel";
  panel.hidden = true;

  const listbox = document.createElement("div");
  listbox.className = "ml-list";
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-label", "Choose a language");

  const options: HTMLDivElement[] = [];

  for (const code of deps.languages) {
    const opt = document.createElement("div");
    opt.className = "ml-option";
    opt.setAttribute("role", "option");
    opt.dataset.code = code;
    opt.tabIndex = -1;

    const flag = document.createElement("span");
    flag.className = "ml-flag";
    flag.setAttribute("aria-hidden", "true");
    setFlag(flag, code);

    const name = document.createElement("span");
    name.className = "ml-name";
    name.textContent = nativeLanguageName(code);

    const shine = document.createElement("span");
    shine.className = "ml-shine";
    shine.setAttribute("aria-hidden", "true");

    opt.append(flag, name, shine);
    opt.addEventListener("click", () => choose(code));
    listbox.appendChild(opt);
    options.push(opt);
  }

  panel.appendChild(listbox);

  // --- Optional "suggest a better phrasing" control ------------------------
  const suggestWrap = document.createElement("div");
  suggestWrap.className = "ml-suggest";

  const suggestToggle = document.createElement("button");
  suggestToggle.type = "button";
  suggestToggle.className = "ml-suggest-toggle";
  suggestToggle.textContent = "Suggest a better phrasing";
  suggestToggle.setAttribute("aria-expanded", "false");

  const suggestForm = document.createElement("div");
  suggestForm.className = "ml-suggest-form";
  suggestForm.hidden = true;

  const suggestLabel = document.createElement("label");
  suggestLabel.className = "ml-sr-only";
  suggestLabel.htmlFor = "ml-suggest-input";
  suggestLabel.textContent = "Your suggested phrasing";

  const suggestInput = document.createElement("input");
  suggestInput.id = "ml-suggest-input";
  suggestInput.type = "text";
  suggestInput.className = "ml-suggest-input";
  suggestInput.placeholder = "How would you say it?";

  const suggestSend = document.createElement("button");
  suggestSend.type = "button";
  suggestSend.className = "ml-suggest-send";
  suggestSend.textContent = "Send";

  suggestForm.append(suggestLabel, suggestInput, suggestSend);
  suggestWrap.append(suggestToggle, suggestForm);
  if (!onSuggest) suggestWrap.hidden = true;

  suggestToggle.addEventListener("click", () => {
    const open = suggestForm.hidden;
    suggestForm.hidden = !open;
    suggestToggle.setAttribute("aria-expanded", String(open));
    if (open) suggestInput.focus();
  });
  suggestSend.addEventListener("click", () => sendSuggestion());
  suggestInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendSuggestion();
    }
  });

  function sendSuggestion(): void {
    const suggested = suggestInput.value.trim();
    if (!suggested || !onSuggest) return;
    const suggestion: Suggestion = {
      source: "",
      language: currentLanguage,
      current: nativeLanguageName(currentLanguage),
      suggested,
    };
    onSuggest(suggestion);
    suggestInput.value = "";
    suggestForm.hidden = true;
    suggestToggle.setAttribute("aria-expanded", "false");
    setStatus("Thanks — your suggestion was sent.");
  }

  panel.appendChild(suggestWrap);

  // --- Live status (screen-reader only) ------------------------------------
  const status = document.createElement("span");
  status.className = "ml-sr-only";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  wrap.append(toggle, panel, status);
  shadow.appendChild(wrap);
  document.body.appendChild(host);

  // --- Behaviour -----------------------------------------------------------
  function setFlag(el: HTMLElement, code: LanguageCode): void {
    // flagFor returns a trusted, library-authored SVG string (no host input);
    // the only interpolated value is the escaped native name inside the SVG.
    el.replaceChildren();
    const svg = svgFromString(flagFor(code));
    if (svg) el.appendChild(svg);
  }

  function renderToggle(): void {
    setFlag(toggleFlag, currentLanguage);
    toggleCode.textContent = shortCode(currentLanguage);
    toggle.setAttribute(
      "aria-label",
      `Language: ${nativeLanguageName(currentLanguage)}. Change language`,
    );
  }

  function renderSelection(): void {
    for (const opt of options) {
      const isSel = opt.dataset.code === currentLanguage;
      opt.setAttribute("aria-selected", String(isSel));
      opt.classList.toggle("ml-selected", isSel);
    }
  }

  function setStatus(text: string): void {
    status.textContent = text;
  }

  function activeIndex(): number {
    const idx = options.findIndex(
      (o) => o.dataset.code === currentLanguage,
    );
    return idx === -1 ? 0 : idx;
  }

  function focusOption(index: number): void {
    const count = options.length;
    if (count === 0) return;
    const i = ((index % count) + count) % count;
    for (const o of options) o.tabIndex = -1;
    const target = options[i];
    if (target) {
      target.tabIndex = 0;
      target.focus();
    }
  }

  function open(): void {
    if (expanded) return;
    expanded = true;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    renderSelection();
    document.addEventListener("keydown", onDocKeydown, true);
    document.addEventListener("pointerdown", onDocPointerDown, true);
    focusOption(activeIndex());
  }

  function close(focusToggle = true): void {
    if (!expanded) return;
    expanded = false;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    suggestForm.hidden = true;
    suggestToggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onDocKeydown, true);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
    if (focusToggle) toggle.focus();
  }

  function choose(code: LanguageCode): void {
    if (code !== currentLanguage) {
      currentLanguage = code;
      renderToggle();
      renderSelection();
      setStatus(`Language: ${nativeLanguageName(code)}`);
      deps.onLanguage(code);
    }
    close();
  }

  toggle.addEventListener("click", () => {
    if (expanded) close();
    else open();
  });

  // Roving-tabindex keyboard model inside the listbox.
  listbox.addEventListener("keydown", (e) => {
    const current = activeFocusIndex();
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        focusOption(current + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        focusOption(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusOption(0);
        break;
      case "End":
        e.preventDefault();
        focusOption(options.length - 1);
        break;
      case "Enter":
      case " ":
      case "Spacebar": {
        e.preventDefault();
        const opt = options[current];
        const code = opt?.dataset.code;
        if (code) choose(code);
        break;
      }
      case "Escape":
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  });

  function activeFocusIndex(): number {
    const active = shadow.activeElement as HTMLElement | null;
    const idx = active ? options.indexOf(active as HTMLDivElement) : -1;
    return idx === -1 ? activeIndex() : idx;
  }

  // Escape from anywhere in the panel; focus-trap keeps Tab inside while open.
  function onDocKeydown(e: KeyboardEvent): void {
    if (!expanded) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      const focusables = collectFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = shadow.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active && !focusables.includes(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onDocPointerDown(e: Event): void {
    const path = e.composedPath();
    if (!path.includes(host)) close(false);
  }

  function collectFocusables(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const active = options.find((o) => o.tabIndex === 0) ?? options[activeIndex()];
    if (active) out.push(active);
    if (!suggestWrap.hidden) {
      out.push(suggestToggle);
      if (!suggestForm.hidden) out.push(suggestInput, suggestSend);
    }
    return out;
  }

  function shortCode(code: LanguageCode): string {
    const primary = code.toLowerCase().split(/[-_]/)[0] ?? code.toLowerCase();
    return primary.toUpperCase();
  }

  renderToggle();
  renderSelection();

  return {
    setLanguage(code) {
      currentLanguage = code;
      renderToggle();
      renderSelection();
      setStatus(`Language: ${nativeLanguageName(code)}`);
    },
    setBusy(busy) {
      wrap.setAttribute("aria-busy", String(busy));
      wrap.classList.toggle("ml-busy", busy);
      spinner.hidden = !busy;
      toggle.disabled = busy;
      if (busy) setStatus("Translating…");
    },
    destroy() {
      document.removeEventListener("keydown", onDocKeydown, true);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      onSuggest = undefined;
      host.remove();
    },
  };
}

/** Parse a trusted SVG string into an element via the namespace-aware parser. */
function svgFromString(svg: string): SVGElement | null {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  if (el && el.localName === "svg") {
    return document.importNode(el, true) as unknown as SVGElement;
  }
  return null;
}

const WIDGET_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.ml-wrap {
  position: fixed;
  z-index: 2147483000;
  font-family: var(--ml-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: 14px;
  color: var(--ml-fg, #16181d);
}
.ml-bottom-right { bottom: 16px; right: 16px; }
.ml-bottom-left { bottom: 16px; left: 16px; }
.ml-top-right { top: 16px; right: 16px; }
.ml-top-left { top: 16px; left: 16px; }

.ml-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ml-surface, #f4f5f7);
  color: var(--ml-fg, #16181d);
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: var(--ml-radius, 12px);
  padding: 6px 12px 6px 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,.12);
  cursor: pointer;
  line-height: 1.2;
  font: inherit;
}
.ml-toggle:disabled { cursor: progress; opacity: .8; }
.ml-toggle:focus-visible,
.ml-option:focus-visible,
.ml-suggest-toggle:focus-visible,
.ml-suggest-send:focus-visible,
.ml-suggest-input:focus-visible {
  outline: 2px solid var(--ml-accent, #2563eb);
  outline-offset: 2px;
}
.ml-code { font-weight: 600; letter-spacing: .02em; }

.ml-flag {
  display: inline-flex;
  width: 30px;
  height: 20px;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08) inset;
}
.ml-flag svg { width: 100%; height: 100%; display: block; }
.ml-flag-current { width: 33px; height: 22px; }

.ml-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  min-width: 220px;
  max-width: 280px;
  max-height: 60vh;
  overflow: auto;
  padding: 8px;
  background: var(--ml-surface, #ffffff);
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: var(--ml-radius, 12px);
  box-shadow: 0 12px 32px rgba(0,0,0,.18);
}
.ml-top-right .ml-panel,
.ml-top-left .ml-panel { bottom: auto; top: calc(100% + 10px); }
.ml-bottom-left .ml-panel,
.ml-top-left .ml-panel { right: auto; left: 0; }

.ml-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ml-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid transparent;
  transition: background-color .15s ease, transform .12s ease, border-color .15s ease;
}
.ml-option:hover { background: var(--ml-hover, rgba(0,0,0,.05)); }
.ml-option:active { transform: scale(.98); }
.ml-selected {
  border-color: var(--ml-accent, #2563eb);
  background: var(--ml-hover, rgba(37,99,235,.08));
}
.ml-selected .ml-flag { width: 36px; height: 24px; }
.ml-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Subtle shine that sweeps across a tile on hover/press. */
.ml-shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255,255,255,.55) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  opacity: 0;
}
.ml-option:hover .ml-shine,
.ml-option:active .ml-shine {
  opacity: 1;
  animation: ml-shine .7s ease forwards;
}
@keyframes ml-shine {
  from { left: -60%; }
  to { left: 130%; }
}

.ml-suggest { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--ml-border, #e3e5ea); }
.ml-suggest-toggle {
  background: none;
  border: none;
  color: var(--ml-accent, #2563eb);
  cursor: pointer;
  font: inherit;
  padding: 4px 2px;
  text-align: left;
  width: 100%;
}
.ml-suggest-form { display: flex; gap: 6px; margin-top: 6px; }
.ml-suggest-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: 8px;
  background: var(--ml-bg, #ffffff);
  color: var(--ml-fg, #16181d);
  font: inherit;
}
.ml-suggest-send {
  background: var(--ml-accent, #2563eb);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
}

.ml-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--ml-border, #e3e5ea);
  border-top-color: var(--ml-accent, #2563eb);
  border-radius: 50%;
  animation: ml-spin .8s linear infinite;
}
@keyframes ml-spin { to { transform: rotate(360deg); } }

/* While busy, slow everything down to signal work in progress. */
.ml-busy .ml-spinner { animation-duration: 1.6s; }
.ml-busy .ml-option:hover .ml-shine,
.ml-busy .ml-option:active .ml-shine { animation-duration: 1.4s; }

@media (prefers-reduced-motion: reduce) {
  .ml-option,
  .ml-toggle { transition: none; }
  .ml-shine { display: none; }
  .ml-option:hover .ml-shine,
  .ml-option:active .ml-shine { animation: none; }
  .ml-spinner { animation-duration: 0s; border-top-color: var(--ml-border, #e3e5ea); }
}

.ml-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;
