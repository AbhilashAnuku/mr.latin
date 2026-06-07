import { describe, it, expect, vi } from "vitest";
import { TranslationCache, type CacheKeyParts } from "./cache";

/**
 * Contract for the two-tier translation cache.
 *
 * The key MUST fold in tone + register so conversational and formal variants of
 * the same source string never collide, and values MUST survive a reload by way
 * of localStorage when persistence is enabled.
 */

const base: CacheKeyParts = {
  source: "Come join us",
  to: "te",
  tone: "conversational",
  register: "casual",
};

describe("TranslationCache.keyFor", () => {
  it("includes the source, target, tone and register", () => {
    const key = TranslationCache.keyFor(base);
    expect(key).toContain("te");
    expect(key).toContain("conversational");
    expect(key).toContain("casual");
    expect(key).toContain("Come join us");
  });

  it("produces a different key when the tone differs", () => {
    const formalTone = TranslationCache.keyFor({ ...base, tone: "formal" });
    expect(TranslationCache.keyFor(base)).not.toBe(formalTone);
  });

  it("produces a different key when the register differs", () => {
    const formalRegister = TranslationCache.keyFor({
      ...base,
      register: "formal",
    });
    expect(TranslationCache.keyFor(base)).not.toBe(formalRegister);
  });

  it("produces a different key when the target language differs", () => {
    const other = TranslationCache.keyFor({ ...base, to: "fr" });
    expect(TranslationCache.keyFor(base)).not.toBe(other);
  });

  it("is stable for identical parts", () => {
    expect(TranslationCache.keyFor(base)).toBe(TranslationCache.keyFor({ ...base }));
  });
});

describe("TranslationCache get/set", () => {
  it("returns undefined for a miss", () => {
    const cache = new TranslationCache(false);
    expect(cache.get(base)).toBeUndefined();
  });

  it("round-trips a stored value", () => {
    const cache = new TranslationCache(false);
    cache.set(base, "రండి, మాతో చేరండి");
    expect(cache.get(base)).toBe("రండి, మాతో చేరండి");
  });

  it("does not return a value for a different tone (no collision)", () => {
    const cache = new TranslationCache(false);
    cache.set(base, "casual variant");
    expect(cache.get({ ...base, tone: "formal" })).toBeUndefined();
  });

  it("does not return a value for a different register", () => {
    const cache = new TranslationCache(false);
    cache.set(base, "casual variant");
    expect(cache.get({ ...base, register: "formal" })).toBeUndefined();
  });
});

describe("TranslationCache persistence", () => {
  it("writes through to localStorage when persistence is enabled", () => {
    localStorage.clear();
    const cache = new TranslationCache(true);
    cache.set(base, "persisted");
    const expectedKey = "mr.latin:v1:" + TranslationCache.keyFor(base);
    expect(localStorage.getItem(expectedKey)).toBe("persisted");
  });

  it("hydrates previously persisted values on construction", () => {
    localStorage.clear();
    const first = new TranslationCache(true);
    first.set(base, "from a previous visit");

    // A fresh instance (a new page load) must see the persisted value.
    const second = new TranslationCache(true);
    expect(second.get(base)).toBe("from a previous visit");
  });

  it("does not touch localStorage when persistence is disabled", () => {
    localStorage.clear();
    const cache = new TranslationCache(false);
    cache.set(base, "memory only");
    const key = "mr.latin:v1:" + TranslationCache.keyFor(base);
    expect(localStorage.getItem(key)).toBeNull();
    // ...but the in-memory tier still serves it.
    expect(cache.get(base)).toBe("memory only");
  });

  it("stays in-memory only when localStorage.setItem throws (quota/disabled)", () => {
    localStorage.clear();
    const cache = new TranslationCache(true);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => cache.set(base, "should not blow up")).not.toThrow();
    expect(cache.get(base)).toBe("should not blow up");
    spy.mockRestore();
  });
});
