import { describe, it, expect, vi, afterEach } from "vitest";
import { buildTranscreationPrompt, createLLMProvider } from "./llm";
import type { TranslateRequest } from "../types";

function req(overrides: Partial<TranslateRequest> = {}): TranslateRequest {
  return {
    texts: ["Come join us", "Apply now"],
    from: "en",
    to: "te",
    tone: "warm",
    register: "casual",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildTranscreationPrompt", () => {
  it("names the tone, register and target language in the system prompt", () => {
    const { system } = buildTranscreationPrompt(req());
    expect(system).toContain("warm"); // tone
    expect(system).toContain("casual"); // register
    expect(system).toContain("te"); // target code
    expect(system).toContain("తెలుగు"); // native target name
  });

  it("includes every input string in the user message", () => {
    const { user } = buildTranscreationPrompt(req());
    expect(user).toContain("Come join us");
    expect(user).toContain("Apply now");
  });

  it("passes the glossary through verbatim", () => {
    const { user } = buildTranscreationPrompt(
      req({ glossary: { VSSW: "VSSW" } }),
    );
    expect(user).toContain("Glossary");
    expect(user).toContain("VSSW");
  });

  it("carries per-text context but flags it as not-for-translation", () => {
    const { user } = buildTranscreationPrompt(
      req({ contexts: [{ role: "button", near: "Hero" }, undefined] }),
    );
    expect(user).toContain("button");
    expect(user).toContain("Hero");
  });
});

describe("createLLMProvider isAvailable", () => {
  it("is unavailable with no endpoint and no apiKey", () => {
    const p = createLLMProvider();
    expect(p.isAvailable("en", "te")).toBe(false);
  });

  it("is available when an endpoint is configured", () => {
    const p = createLLMProvider({ endpoint: "https://example.test/translate" });
    expect(p.isAvailable("en", "te")).toBe(true);
  });

  it("is available when an apiKey is configured (direct mode)", () => {
    const p = createLLMProvider({ apiKey: "sk-test" });
    expect(p.isAvailable("en", "te")).toBe(true);
  });

  it("is named 'llm'", () => {
    expect(createLLMProvider().name).toBe("llm");
  });
});

describe("createLLMProvider translate (mocked fetch)", () => {
  it("returns an aligned array from a proxy endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ translations: ["రండి", "ఇప్పుడే దరఖాస్తు చేయండి"] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const p = createLLMProvider({ endpoint: "https://example.test/translate" });
    const out = await p.translate(req());

    expect(out).toEqual(["రండి", "ఇప్పుడే దరఖాస్తు చేయండి"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an aligned array from a direct vendor call", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ text: JSON.stringify(["రండి", "ఇప్పుడే"]) }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const p = createLLMProvider({ apiKey: "sk-test", vendor: "anthropic" });
    const out = await p.translate(req());

    expect(out).toEqual(["రండి", "ఇప్పుడే"]);
  });

  it("falls back to source text for any gap on a short array", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ translations: ["రండి"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const p = createLLMProvider({ endpoint: "https://example.test/translate" });
    const out = await p.translate(req());

    // First slot filled by the model, second slot falls back to the source.
    expect(out).toEqual(["రండి", "Apply now"]);
  });

  it("short-circuits an empty batch without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const p = createLLMProvider({ endpoint: "https://example.test/translate" });
    const out = await p.translate(req({ texts: [] }));

    expect(out).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates a non-OK proxy response as an error", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const p = createLLMProvider({ endpoint: "https://example.test/translate" });
    await expect(p.translate(req())).rejects.toThrow();
  });
});
