import { describe, it, expect, vi } from "vitest";
import {
  scan,
  observe,
  setSkipSelectors,
  setWriteSuppressed,
  isSkipped,
  clearCanonical,
  type TextUnit,
} from "./scanner";

/**
 * Contract for the DOM scanner (functional API).
 *
 * It walks a root and yields the translatable *source strings* it finds in
 * (a) text nodes and (b) a fixed set of attributes
 * (placeholder/title/alt/aria-label). Identical originals are deduped into one
 * key whose array holds every place that text appears. It honours every skip
 * rule and — once observing — ignores the mutations the engine itself makes
 * when it writes translations back (write-suppression).
 */

function mount(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

/** The distinct source strings produced by a scan, in insertion order. */
function sources(root: HTMLElement): string[] {
  return Array.from(scan(root).keys());
}

/** Wait one debounce window (observer flushes after ~60ms). */
function nextFlush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 80));
}

describe("Scanner text extraction", () => {
  it("extracts visible text", () => {
    const root = mount("<p>Hello world</p><span>Apply now</span>");
    const found = sources(root);
    expect(found).toContain("Hello world");
    expect(found).toContain("Apply now");
    clearCanonical();
    root.remove();
  });

  it("ignores whitespace-only and empty text nodes", () => {
    const root = mount("<p>   </p><p>\n\t</p><p>Real</p>");
    const found = sources(root);
    expect(found).toEqual(["Real"]);
    clearCanonical();
    root.remove();
  });

  it("records the source text on each unit's `original` field", () => {
    const root = mount("<p>Hello world</p>");
    const map = scan(root);
    const units = map.get("Hello world");
    expect(units).toBeDefined();
    const first = units?.[0];
    expect(first).toBeDefined();
    expect(first?.original).toBe("Hello world");
    expect(first?.kind).toBe("text");
    expect(first?.node.nodeType).toBe(3);
    clearCanonical();
    root.remove();
  });
});

describe("Scanner attribute extraction", () => {
  it("extracts placeholder, title, alt and aria-label", () => {
    const root = mount(
      `<input placeholder="Search here" />
       <a title="Open menu">x</a>
       <img alt="A photo" />
       <button aria-label="Close dialog"></button>`,
    );
    const found = sources(root);
    expect(found).toContain("Search here");
    expect(found).toContain("Open menu");
    expect(found).toContain("A photo");
    expect(found).toContain("Close dialog");
    clearCanonical();
    root.remove();
  });

  it("marks attribute units with kind 'attr' and the attribute name", () => {
    const root = mount(`<input placeholder="Search here" />`);
    const units = scan(root).get("Search here");
    const attrUnit = units?.find((u: TextUnit) => u.kind === "attr");
    expect(attrUnit).toBeDefined();
    expect(attrUnit?.attr).toBe("placeholder");
    clearCanonical();
    root.remove();
  });
});

describe("Scanner skip rules", () => {
  it('skips translate="no" subtrees', () => {
    const root = mount(`<div translate="no"><p>Brand</p></div><p>Keep</p>`);
    const found = sources(root);
    expect(found).not.toContain("Brand");
    expect(found).toContain("Keep");
    clearCanonical();
    root.remove();
  });

  it("skips .notranslate subtrees", () => {
    const root = mount(`<p class="notranslate">VSSW</p><p>Keep</p>`);
    const found = sources(root);
    expect(found).not.toContain("VSSW");
    expect(found).toContain("Keep");
    clearCanonical();
    root.remove();
  });

  it("skips [data-mr-latin-skip] subtrees (the widget's own marker)", () => {
    const root = mount(
      `<div data-mr-latin-skip><p>Widget UI</p></div><p>Keep</p>`,
    );
    const found = sources(root);
    expect(found).not.toContain("Widget UI");
    expect(found).toContain("Keep");
    clearCanonical();
    root.remove();
  });

  it("skips script and style content", () => {
    const root = mount(
      `<script>var secret = "do not translate";</script>
       <style>.x { color: "red"; }</style>
       <p>Keep</p>`,
    );
    const found = sources(root);
    expect(found).not.toContain('var secret = "do not translate";');
    expect(found).not.toContain('.x { color: "red"; }');
    expect(found).toContain("Keep");
    clearCanonical();
    root.remove();
  });

  it("honours caller-supplied skipSelectors", () => {
    const root = mount(`<code>const x = 1</code><p>Keep</p>`);
    setSkipSelectors(["code"]);
    const found = sources(root);
    expect(found).not.toContain("const x = 1");
    expect(found).toContain("Keep");
    // Reset for other tests.
    setSkipSelectors(undefined);
    clearCanonical();
    root.remove();
  });

  it("isSkipped reports true inside a skipped subtree and false outside", () => {
    const root = mount(
      `<div class="notranslate"><span id="in">In</span></div>` +
        `<span id="out">Out</span>`,
    );
    const inEl = root.querySelector("#in");
    const outEl = root.querySelector("#out");
    expect(inEl).not.toBeNull();
    expect(outEl).not.toBeNull();
    if (inEl) expect(isSkipped(inEl)).toBe(true);
    if (outEl) expect(isSkipped(outEl)).toBe(false);
    clearCanonical();
    root.remove();
  });
});

describe("Scanner dedupe", () => {
  it("returns each distinct source string only once", () => {
    const root = mount(
      `<p>Apply now</p><a>Apply now</a><button>Apply now</button>`,
    );
    const found = sources(root);
    const occurrences = found.filter((s) => s === "Apply now");
    expect(occurrences).toHaveLength(1);
    clearCanonical();
    root.remove();
  });

  it("collects every occurrence under the single deduped key", () => {
    const root = mount(
      `<p>Apply now</p><a>Apply now</a><button>Apply now</button>`,
    );
    const units = scan(root).get("Apply now");
    expect(units).toBeDefined();
    // Three text nodes share the same source string.
    expect(units?.length).toBe(3);
    clearCanonical();
    root.remove();
  });
});

describe("Scanner observer", () => {
  it("reports text added after the initial scan and returns a disconnect fn", async () => {
    const root = mount(`<p>Initial</p>`);
    const onAdded = vi.fn();
    const disconnect = observe(root, onAdded);
    expect(typeof disconnect).toBe("function");

    const added = document.createElement("p");
    added.textContent = "Dynamically added";
    root.appendChild(added);

    await nextFlush();

    expect(onAdded).toHaveBeenCalled();
    const firstCall = onAdded.mock.calls[0];
    expect(firstCall).toBeDefined();
    // The callback receives an array of roots under which new text appeared.
    const roots = firstCall?.[0];
    expect(Array.isArray(roots)).toBe(true);

    disconnect();
    clearCanonical();
    root.remove();
  });

  it("ignores the engine's own writes (no self-trigger loop)", async () => {
    const root = mount(`<p>Source text</p>`);
    const onAdded = vi.fn();
    const disconnect = observe(root, onAdded);

    // The engine brackets its DOM writes with write-suppression so the
    // MutationObserver ignores them and never re-reports its own output.
    const p = root.querySelector("p");
    expect(p).not.toBeNull();
    const node = p?.firstChild as Text | null | undefined;
    expect(node).toBeTruthy();

    setWriteSuppressed(true);
    try {
      if (node) node.textContent = "Übersetzter Text";
    } finally {
      setWriteSuppressed(false);
    }

    await nextFlush();

    expect(onAdded).not.toHaveBeenCalled();
    expect(root.querySelector("p")?.textContent).toBe("Übersetzter Text");

    disconnect();
    clearCanonical();
    root.remove();
  });

  it("stops reporting once disconnected", async () => {
    const root = mount(`<p>Initial</p>`);
    const onAdded = vi.fn();
    const disconnect = observe(root, onAdded);
    disconnect();

    const added = document.createElement("p");
    added.textContent = "After disconnect";
    root.appendChild(added);

    await nextFlush();

    expect(onAdded).not.toHaveBeenCalled();
    clearCanonical();
    root.remove();
  });
});
