/**
 * DOM scanner + observer.
 *
 * Walks a root subtree and collects every translatable piece of text — visible
 * text nodes plus a fixed allow-list of attributes — pairing each with light
 * context (the nearest heading/label, the page title, and a role hint) so the
 * translator can phrase it the way a human would. It also installs a debounced
 * MutationObserver so content added after load gets translated too, while
 * carefully ignoring the engine's own writes.
 *
 * Hard rule shared with the rest of the engine: we only ever read/write text
 * via `textContent` / `getAttribute` / `setAttribute` — never `innerHTML`.
 */

/** A single translatable unit: a text node, or one attribute of an element. */
export interface TextUnit {
  node: Node;
  kind: "text" | "attr";
  /** Attribute name when `kind === "attr"`. */
  attr?: string;
  /** The authored source text (trimmed-aware: see `original` vs node value). */
  original: string;
  context: {
    near?: string;
    page?: string;
    role?: string;
  };
}

/** Attributes that hold human-facing copy and should be translated. */
const TRANSLATABLE_ATTRS = [
  "placeholder",
  "title",
  "alt",
  "aria-label",
  "aria-placeholder",
] as const;

/** input types whose `value` is a button caption and thus translatable. */
const VALUE_INPUT_TYPES = new Set(["button", "submit", "reset"]);

/** The widget's custom-element host — never translate our own UI. */
const WIDGET_HOST_TAG = "mr-latin-widget";

/** Tags whose contents are code/markup, never natural-language copy. */
const NON_TEXT_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

/** Map a tag/role to a short hint the provider can use ("button", "heading"…). */
function roleHint(el: Element): string | undefined {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName;
  switch (tag) {
    case "BUTTON":
      return "button";
    case "A":
      return "link";
    case "LABEL":
      return "label";
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return "heading";
    case "LI":
      return "list item";
    case "TH":
      return "table header";
    case "TD":
      return "table cell";
    case "OPTION":
      return "option";
    case "SUMMARY":
      return "summary";
    case "FIGCAPTION":
      return "caption";
    default:
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return "form field";
      }
      return undefined;
  }
}

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

/** The page-level context: the document title, else its meta description. */
function pageContext(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const title = document.title?.trim();
  if (title) return title;
  const meta = document.querySelector('meta[name="description"]');
  const desc = meta?.getAttribute("content")?.trim();
  return desc || undefined;
}

/** First non-empty text content of an element, capped so context stays small. */
function shortText(el: Element | null): string | undefined {
  if (!el) return undefined;
  const text = el.textContent?.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 120 ? text.slice(0, 117) + "…" : text;
}

/**
 * The nearest heading or label "above" this element: the closest preceding
 * heading among ancestors and their previous siblings, else an associated
 * `<label>`. Used purely as translation context.
 */
function nearContext(start: Element): string | undefined {
  // A directly-associated label (for form fields).
  const labelled = start.closest("label");
  if (labelled && !HEADING_TAGS.has(start.tagName)) {
    const text = shortText(labelled);
    if (text) return text;
  }

  let el: Element | null = start;
  while (el && el !== document.body) {
    // Look back through previous siblings for a heading/label.
    let sib: Element | null = el.previousElementSibling;
    while (sib) {
      if (HEADING_TAGS.has(sib.tagName) || sib.tagName === "LABEL") {
        const text = shortText(sib);
        if (text) return text;
      }
      // A heading nested at the start of a previous block (e.g. a section).
      const inner = sib.querySelector?.("h1,h2,h3,h4,h5,h6");
      if (inner) {
        const text = shortText(inner);
        if (text) return text;
      }
      sib = sib.previousElementSibling;
    }
    el = el.parentElement;
  }
  return undefined;
}

/** Build the context bag for a unit anchored at `el`. */
function contextFor(el: Element, page: string | undefined): TextUnit["context"] {
  const ctx: TextUnit["context"] = {};
  const near = nearContext(el);
  if (near) ctx.near = near;
  if (page) ctx.page = page;
  const role = roleHint(el);
  if (role) ctx.role = role;
  return ctx;
}

// --- Skip detection --------------------------------------------------------

let skipSelectorList: string[] = [];

/** WeakSet caches keyed per-element so ancestor walks aren't repeated. */
let skipYes = new WeakSet<Element>();
let skipNo = new WeakSet<Element>();

/** Configure additional selectors whose subtrees are never translated. */
export function setSkipSelectors(selectors: string[] | undefined): void {
  skipSelectorList = selectors ? selectors.slice() : [];
  // Selector changes invalidate the memoised decisions.
  skipYes = new WeakSet<Element>();
  skipNo = new WeakSet<Element>();
}

/** Does this single element opt out of translation (not counting ancestors)? */
function isSelfSkipped(el: Element): boolean {
  const tag = el.tagName;
  if (tag === WIDGET_HOST_TAG.toUpperCase()) return true;
  if (NON_TEXT_TAGS.has(tag)) return true;
  if (el.getAttribute("translate") === "no") return true;
  if (el.classList.contains("notranslate")) return true;
  if (el.hasAttribute("data-mr-latin-skip")) return true;
  const ce = el.getAttribute("contenteditable");
  if (ce === "" || ce === "true" || ce === "plaintext-only") return true;
  if (skipSelectorList.length) {
    for (const sel of skipSelectorList) {
      try {
        if (el.matches(sel)) return true;
      } catch {
        /* invalid selector — ignore */
      }
    }
  }
  return false;
}

/**
 * True if `node` lives inside (or is) a subtree that must not be translated.
 * Walks ancestors once and memoises the answer per element via WeakSets.
 */
export function isSkipped(node: Node): boolean {
  let el: Element | null =
    node.nodeType === 1
      ? (node as Element)
      : (node.parentElement ?? null);

  const chain: Element[] = [];
  let decision: boolean | undefined;

  while (el) {
    if (skipYes.has(el)) {
      decision = true;
      break;
    }
    if (skipNo.has(el)) {
      decision = false;
      break;
    }
    if (isSelfSkipped(el)) {
      // This element (and everything below it on `chain`) is skipped.
      skipYes.add(el);
      decision = true;
      break;
    }
    chain.push(el);
    el = el.parentElement;
  }

  const result = decision ?? false;
  // Memoise the whole walked chain with the resolved answer.
  const bucket = result ? skipYes : skipNo;
  for (const e of chain) bucket.add(e);
  return result;
}

// --- Scanning --------------------------------------------------------------

/** Whether a text node carries any non-whitespace content worth translating. */
function isMeaningfulText(node: Node): boolean {
  const value = node.nodeValue;
  return value != null && value.trim().length > 0;
}

/** The translatable `value` attribute, if this is a button-like input. */
function valueAttrName(el: Element): string | undefined {
  if (el.tagName !== "INPUT") return undefined;
  const type = (el.getAttribute("type") ?? "text").toLowerCase();
  return VALUE_INPUT_TYPES.has(type) ? "value" : undefined;
}

// --- Canonical-source registry --------------------------------------------
//
// Once a node has been translated, its DOM value is the *translated* text, not
// the source. To support switching between languages we remember each node's
// original source string the first time we see it, and always translate from
// that canonical source rather than the (possibly already-translated) DOM value.

let canonicalText = new WeakMap<Node, string>();
let canonicalAttr = new WeakMap<Element, Map<string, string>>();

/** The recorded source for a text node, recording the current value on first sight. */
function sourceForText(node: Node, current: string): string {
  const known = canonicalText.get(node);
  if (known !== undefined) return known;
  canonicalText.set(node, current);
  return current;
}

/** The recorded source for an element attribute (record on first sight). */
function sourceForAttr(el: Element, attr: string, current: string): string {
  let map = canonicalAttr.get(el);
  if (!map) {
    map = new Map<string, string>();
    canonicalAttr.set(el, map);
  }
  const known = map.get(attr);
  if (known !== undefined) return known;
  map.set(attr, current);
  return current;
}

/** Forget all recorded originals (used when reverting to source). */
export function clearCanonical(): void {
  // WeakMaps cannot be enumerated/cleared; replace them wholesale.
  canonicalText = new WeakMap<Node, string>();
  canonicalAttr = new WeakMap<Element, Map<string, string>>();
}

/**
 * Collect every translatable unit under `root`, grouped by source text.
 *
 * Identical originals are deduped into a single key whose array holds every
 * place that text appears — so the translator translates once and applies the
 * result everywhere.
 */
export function scan(root: Node): Map<string, TextUnit[]> {
  const units = new Map<string, TextUnit[]>();
  if (typeof document === "undefined") return units;
  const page = pageContext();

  const add = (unit: TextUnit): void => {
    const existing = units.get(unit.original);
    if (existing) existing.push(unit);
    else units.set(unit.original, [unit]);
  };

  const collectAttr = (el: Element, attr: string): void => {
    const raw = el.getAttribute(attr);
    const value = raw?.trim();
    if (!value) return;
    add({
      node: el,
      kind: "attr",
      attr,
      original: sourceForAttr(el, attr, value),
      context: contextFor(el, page),
    });
  };

  const collectAttrs = (el: Element): void => {
    for (const attr of TRANSLATABLE_ATTRS) collectAttr(el, attr);
    const valueAttr = valueAttrName(el);
    if (valueAttr) collectAttr(el, valueAttr);
  };

  const collectText = (node: Node): void => {
    const current = (node.nodeValue ?? "").trim();
    if (!current) return;
    const el = node.parentElement;
    add({
      node,
      kind: "text",
      original: sourceForText(node, current),
      context: el ? contextFor(el, page) : {},
    });
  };

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        if (node.nodeType === 3) {
          if (!isMeaningfulText(node)) return NodeFilter.FILTER_REJECT;
          if (isSkipped(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        // Element: prune skipped subtrees entirely; otherwise descend so we can
        // also inspect its attributes.
        if (isSkipped(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  // The walker's root is included; handle it explicitly when it's an element.
  if (root.nodeType === 1 && !isSkipped(root)) {
    collectAttrs(root as Element);
  } else if (root.nodeType === 3 && isMeaningfulText(root) && !isSkipped(root)) {
    collectText(root);
  }

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === 3) {
      collectText(current);
    } else if (current.nodeType === 1) {
      collectAttrs(current as Element);
    }
    current = walker.nextNode();
  }

  return units;
}

// --- Write suppression -----------------------------------------------------

/**
 * Set while the engine writes translated text back into the DOM, so the
 * MutationObserver can ignore its own mutations and avoid an infinite loop.
 */
let writeSuppressed = false;

/**
 * Observers currently watching the page. Tracked so that when a suppressed
 * write block ends we can drain (and discard) the mutation records our own
 * writes produced — MutationObserver delivers asynchronously, so checking the
 * flag inside the callback alone is not enough to avoid a self-retranslation
 * loop.
 */
const activeObservers = new Set<MutationObserver>();

/** Toggle the write-suppression flag (the translator brackets its writes). */
export function setWriteSuppressed(value: boolean): void {
  // Leaving a suppressed block: throw away the records our own writes produced
  // before the observer's async callback can see them.
  if (!value && writeSuppressed) {
    for (const obs of activeObservers) obs.takeRecords();
  }
  writeSuppressed = value;
}

/** Read the current write-suppression state. */
export function isWriteSuppressed(): boolean {
  return writeSuppressed;
}

// --- Observing -------------------------------------------------------------

/** Callback invoked (debounced) with the roots under which new text appeared. */
export type OnAdded = (roots: Node[]) => void;

const OBSERVED_ATTRS: string[] = [
  ...TRANSLATABLE_ATTRS,
  "value",
];

/**
 * Watch `root` for added/changed text and translatable attributes, calling
 * `onAdded` (debounced) with the affected nodes. Honours the same skip rules as
 * `scan` and ignores the engine's own writes via the write-suppression flag.
 *
 * Returns a disconnect function.
 */
export function observe(root: Node, onAdded: OnAdded): () => void {
  if (typeof MutationObserver === "undefined") return () => {};

  const pending = new Set<Node>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    timer = undefined;
    if (pending.size === 0) return;
    const roots = Array.from(pending);
    pending.clear();
    onAdded(roots);
  };

  const schedule = (): void => {
    if (timer !== undefined) return;
    timer = setTimeout(flush, 60);
  };

  const queue = (node: Node): void => {
    if (isSkipped(node)) return;
    pending.add(node);
    schedule();
  };

  const observer = new MutationObserver((records) => {
    // Never react to our own writes.
    if (isWriteSuppressed()) return;
    for (const record of records) {
      if (record.type === "childList") {
        record.addedNodes.forEach((added) => {
          if (added.nodeType === 1 || added.nodeType === 3) queue(added);
        });
      } else if (record.type === "characterData") {
        if (isMeaningfulText(record.target)) queue(record.target);
      } else if (record.type === "attributes") {
        const name = record.attributeName;
        if (name && OBSERVED_ATTRS.includes(name)) queue(record.target);
      }
    }
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: OBSERVED_ATTRS,
  });
  activeObservers.add(observer);

  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    pending.clear();
    observer.disconnect();
    activeObservers.delete(observer);
  };
}
