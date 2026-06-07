import { describe, it, expect, vi } from "vitest";
import { Translator, type TranslatorOptions } from "./translator";
import { TranslationCache } from "./cache";
import type { TextUnit } from "./scanner";
import type {
  TranslateRequest,
  TranslationProvider,
  LanguageCode,
  Tone,
  Register,
} from "../types";

/**
 * Contract for the layered translator (functional, DOM-applying API).
 *
 * `translateUnits(units, from, to)` resolves each unique source string by a
 * strict order — hand-authored DICTIONARY wins, then the CACHE, then the first
 * available PROVIDER for the remaining strings — and APPLIES the result to the
 * DOM (textContent / setAttribute). Provider input is batched; any gap (short
 * array, missing slot, no provider) falls back to the source string so the page
 * is never left blank. A run forwards an abort signal to the provider.
 */

/** A controllable fake provider so tests stay deterministic (no network). */
function fakeProvider(
  impl: (req: TranslateRequest) => string[] | Promise<string[]>,
  opts: { name?: string; available?: boolean } = {},
): TranslationProvider & { calls: TranslateRequest[] } {
  const calls: TranslateRequest[] = [];
  return {
    name: opts.name ?? "fake",
    calls,
    isAvailable(_from: LanguageCode, _to: LanguageCode) {
      return opts.available ?? true;
    },
    async translate(req: TranslateRequest) {
      calls.push(req);
      return impl(req);
    },
  };
}

const TONE: Tone = "conversational";
const REGISTER: Register = "casual";

/**
 * Build a `Map<string, TextUnit[]>` of real DOM text nodes keyed by source
 * string (the shape `scan` produces). Returns the map plus the nodes so the
 * test can read back the applied translation.
 */
function unitsFor(sources: string[]): {
  map: Map<string, TextUnit[]>;
  nodes: Map<string, Text>;
} {
  const map = new Map<string, TextUnit[]>();
  const nodes = new Map<string, Text>();
  for (const source of sources) {
    const node = document.createTextNode(source);
    nodes.set(source, node);
    map.set(source, [
      {
        node,
        kind: "text",
        original: source,
        context: {},
      },
    ]);
  }
  return { map, nodes };
}

/** Read the applied text for a source string from the built node map. */
function applied(nodes: Map<string, Text>, source: string): string {
  const node = nodes.get(source);
  expect(node).toBeDefined();
  return node?.textContent ?? "";
}

/** Construct a Translator with required cache/tone/register defaults. */
function makeTranslator(
  partial: Partial<TranslatorOptions> & { providers: TranslationProvider[] },
): Translator {
  return new Translator({
    cache: partial.cache ?? new TranslationCache(false),
    tone: partial.tone ?? TONE,
    register: partial.register ?? REGISTER,
    providers: partial.providers,
    dictionary: partial.dictionary,
    glossary: partial.glossary,
    onBusy: partial.onBusy,
  });
}

describe("Translator precedence", () => {
  it("prefers the dictionary over everything", async () => {
    const provider = fakeProvider(() => ["from-provider"]);
    const t = makeTranslator({
      dictionary: { de: { Hello: "Hallo (dict)" } },
      providers: [provider],
    });
    const { map, nodes } = unitsFor(["Hello"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "Hello")).toBe("Hallo (dict)");
    expect(provider.calls).toHaveLength(0);
  });

  it("prefers the cache over the provider", async () => {
    const cache = new TranslationCache(false);
    cache.set(
      { source: "Hello", to: "de", tone: TONE, register: REGISTER },
      "Hallo (cache)",
    );
    const provider = fakeProvider(() => ["from-provider"]);
    const t = makeTranslator({ cache, providers: [provider] });
    const { map, nodes } = unitsFor(["Hello"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "Hello")).toBe("Hallo (cache)");
    expect(provider.calls).toHaveLength(0);
  });

  it("falls through dictionary -> cache -> provider per string", async () => {
    const cache = new TranslationCache(false);
    cache.set(
      { source: "B", to: "de", tone: TONE, register: REGISTER },
      "B-cache",
    );
    const provider = fakeProvider((req) => req.texts.map((s) => `${s}-prov`));
    const t = makeTranslator({
      dictionary: { de: { A: "A-dict" } },
      cache,
      providers: [provider],
    });

    const { map, nodes } = unitsFor(["A", "B", "C"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "A")).toBe("A-dict");
    expect(applied(nodes, "B")).toBe("B-cache");
    expect(applied(nodes, "C")).toBe("C-prov");
    // Only the uncovered string "C" should reach the provider.
    expect(provider.calls).toHaveLength(1);
    const firstCall = provider.calls[0];
    expect(firstCall?.texts).toEqual(["C"]);
  });

  it("caches successful provider results for reuse", async () => {
    const cache = new TranslationCache(false);
    const provider = fakeProvider((req) => req.texts.map((s) => `${s}!`));
    const t = makeTranslator({ cache, providers: [provider] });

    const first = unitsFor(["greet"]);
    await t.translateUnits(first.map, "en", "de");
    expect(applied(first.nodes, "greet")).toBe("greet!");

    // Second run: same key should now resolve from the cache, not the provider.
    const second = unitsFor(["greet"]);
    await t.translateUnits(second.map, "en", "de");
    expect(applied(second.nodes, "greet")).toBe("greet!");
    expect(provider.calls).toHaveLength(1);
  });
});

describe("Translator batching", () => {
  it("sends all uncovered strings in a single provider call", async () => {
    const provider = fakeProvider((req) =>
      req.texts.map((s) => s.toUpperCase()),
    );
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["a", "b", "c"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "a")).toBe("A");
    expect(applied(nodes, "b")).toBe("B");
    expect(applied(nodes, "c")).toBe("C");
    expect(provider.calls).toHaveLength(1);
    const firstCall = provider.calls[0];
    expect(firstCall?.texts).toEqual(["a", "b", "c"]);
  });

  it("forwards aligned per-text context to the provider", async () => {
    const provider = fakeProvider((req) => req.texts.map((s) => `${s}-x`));
    const t = makeTranslator({ providers: [provider] });

    const node = document.createTextNode("Save");
    const map = new Map<string, TextUnit[]>([
      [
        "Save",
        [
          {
            node,
            kind: "text",
            original: "Save",
            context: { role: "button", page: "Settings" },
          },
        ],
      ],
    ]);
    await t.translateUnits(map, "en", "de");
    const firstCall = provider.calls[0];
    expect(firstCall?.contexts?.[0]).toEqual({
      role: "button",
      page: "Settings",
    });
  });
});

describe("Translator gap handling", () => {
  it("falls back to source for missing/short provider results", async () => {
    const provider = fakeProvider(() => ["only-one"]); // short array
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["one", "two"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "one")).toBe("only-one");
    // No result for "two" -> the source string is left in place.
    expect(applied(nodes, "two")).toBe("two");
  });

  it("falls back to source when no provider is available", async () => {
    const provider = fakeProvider(() => ["never"], { available: false });
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["keep me"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "keep me")).toBe("keep me");
    expect(provider.calls).toHaveLength(0);
  });

  it("falls back to source when the provider throws", async () => {
    const provider = fakeProvider(() => {
      throw new Error("provider exploded");
    });
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["resilient"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "resilient")).toBe("resilient");
  });
});

describe("Translator provider selection", () => {
  it("uses the first available provider in the chain", async () => {
    const unavailable = fakeProvider(() => ["nope"], {
      name: "off",
      available: false,
    });
    const available = fakeProvider(() => ["yes"], {
      name: "on",
      available: true,
    });
    const t = makeTranslator({ providers: [unavailable, available] });
    const { map, nodes } = unitsFor(["go"]);
    await t.translateUnits(map, "en", "de");
    expect(applied(nodes, "go")).toBe("yes");
    expect(unavailable.calls).toHaveLength(0);
    expect(available.calls).toHaveLength(1);
  });
});

describe("Translator glossary passthrough", () => {
  it("forwards the configured glossary to the provider request", async () => {
    const provider = fakeProvider((req) => req.texts.map((s) => s));
    const t = makeTranslator({
      providers: [provider],
      glossary: { VSSW: "VSSW" },
    });
    const { map } = unitsFor(["Welcome to VSSW"]);
    await t.translateUnits(map, "en", "de");
    const firstCall = provider.calls[0];
    expect(firstCall?.glossary).toEqual({ VSSW: "VSSW" });
  });
});

describe("Translator no-op", () => {
  it("does nothing when from === to", async () => {
    const provider = fakeProvider((req) => req.texts.map((s) => `${s}!`));
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["same"]);
    await t.translateUnits(map, "en", "en");
    expect(applied(nodes, "same")).toBe("same");
    expect(provider.calls).toHaveLength(0);
  });
});

describe("Translator abort", () => {
  it("forwards the abort signal to the provider", async () => {
    const controller = new AbortController();
    const provider = fakeProvider((req) => {
      expect(req.signal).toBeInstanceOf(AbortSignal);
      return req.texts;
    });
    const t = makeTranslator({ providers: [provider] });
    const { map } = unitsFor(["x"]);
    await t.translateUnits(map, "en", "de", controller.signal);
    const firstCall = provider.calls[0];
    expect(firstCall?.signal).toBeInstanceOf(AbortSignal);
  });

  it("does not apply results when aborted before the run", async () => {
    const provider = fakeProvider((req) => req.texts.map((s) => `${s}!`));
    const t = makeTranslator({ providers: [provider] });
    const controller = new AbortController();
    controller.abort();
    const { map, nodes } = unitsFor(["x"]);
    await t.translateUnits(map, "en", "de", controller.signal);
    // Aborted run leaves the source string untouched.
    expect(applied(nodes, "x")).toBe("x");
  });

  it("abort() cancels an in-flight run so it never applies", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = fakeProvider(async (req) => {
      await gate;
      return req.texts.map((s) => `${s}!`);
    });
    const t = makeTranslator({ providers: [provider] });
    const { map, nodes } = unitsFor(["late"]);

    const run = t.translateUnits(map, "en", "de");
    // Abort while the provider is still pending, then let it resolve.
    t.abort();
    release?.();
    await run;

    expect(applied(nodes, "late")).toBe("late");
  });
});
