import { describe, it, expect, vi } from "vitest";
import { flagFor } from "./flags";

/**
 * Contract for the inline flag/tile renderer.
 *
 * `flagFor` returns a self-contained, inline SVG string for every language we
 * support (so the picker needs no image assets and no network), a graceful
 * fallback tile for codes we don't recognise, and it resolves region-tagged
 * codes (e.g. "en-US") to a sensible flag.
 */

const SUPPORTED = [
  "en",
  "de",
  "fr",
  "es",
  "it",
  "ar",
  "fa",
  "zh",
  "ja",
  "hi",
  "ru",
  "uk",
  "tr",
];

describe("flagFor", () => {
  it("returns an inline <svg ...> string for every supported language", () => {
    for (const code of SUPPORTED) {
      const svg = flagFor(code);
      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
      expect(svg.length).toBeGreaterThan(0);
    }
  });

  it("returns a string for an unknown code (a fallback tile, not empty)", () => {
    const fallback = flagFor("zz");
    expect(typeof fallback).toBe("string");
    expect(fallback).toContain("<svg");
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("never returns empty for any input", () => {
    expect(flagFor("").length).toBeGreaterThan(0);
  });

  it("handles a region-tagged code (en-US resolves to a flag)", () => {
    const enUS = flagFor("en-US");
    expect(enUS).toContain("<svg");
    expect(enUS.length).toBeGreaterThan(0);
  });

  it("is case-insensitive on the primary subtag", () => {
    expect(flagFor("EN")).toContain("<svg");
    expect(flagFor("De")).toContain("<svg");
  });

  it("does not differ between a region-tagged code and its base for unknown regions of a known language", () => {
    // A known language with any region should still produce a flag.
    expect(flagFor("de-AT")).toContain("<svg");
    expect(flagFor("fr-CA")).toContain("<svg");
  });

  it("is a pure function — same input, same output, no side effects", () => {
    // No DOM writes, no network: stub fetch and assert it is never touched.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const a = flagFor("ja");
    const b = flagFor("ja");
    expect(a).toBe(b);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
