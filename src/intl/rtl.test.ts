import { describe, it, expect, vi } from "vitest";
import { isRTL, applyDirection } from "./rtl";

describe("isRTL", () => {
  it("is true for right-to-left languages", () => {
    expect(isRTL("ar")).toBe(true); // Arabic
    expect(isRTL("he")).toBe(true); // Hebrew
    expect(isRTL("fa")).toBe(true); // Persian
    expect(isRTL("ur")).toBe(true); // Urdu
  });

  it("is false for left-to-right languages", () => {
    expect(isRTL("en")).toBe(false);
    expect(isRTL("de")).toBe(false);
  });

  it("looks only at the primary subtag, ignoring region/script", () => {
    expect(isRTL("ar-EG")).toBe(true);
    expect(isRTL("ar_SA")).toBe(true);
    expect(isRTL("en-US")).toBe(false);
  });

  it("is case-insensitive on the primary subtag", () => {
    expect(isRTL("AR")).toBe(true);
    expect(isRTL("He")).toBe(true);
  });
});

describe("applyDirection", () => {
  it("sets dir=rtl and lang on an RTL element", () => {
    const el = document.createElement("div");
    applyDirection("ar", el);
    expect(el.getAttribute("dir")).toBe("rtl");
    expect(el.getAttribute("lang")).toBe("ar");
  });

  it("sets dir=ltr and lang on an LTR element", () => {
    const el = document.createElement("div");
    applyDirection("en", el);
    expect(el.getAttribute("dir")).toBe("ltr");
    expect(el.getAttribute("lang")).toBe("en");
  });

  it("defaults to the document element", () => {
    applyDirection("he");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("he");

    // Reset so the default doesn't leak into other tests.
    applyDirection("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("writes via setAttribute (never innerHTML) for both lang and dir", () => {
    const el = document.createElement("div");
    const spy = vi.spyOn(el, "setAttribute");
    applyDirection("ur", el);
    expect(spy).toHaveBeenCalledWith("lang", "ur");
    expect(spy).toHaveBeenCalledWith("dir", "rtl");
    spy.mockRestore();
  });
});
