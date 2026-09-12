import { describe, it, expect, vi } from "vitest";
import { measureTextWidth } from "./text-cache";

function makeFakeCtx(font: string, widthOf: (text: string) => number) {
  return {
    font,
    measureText: vi.fn((text: string) => ({ width: widthOf(text) })),
  } as unknown as CanvasRenderingContext2D;
}

describe("measureTextWidth cache", () => {
  it("returns the measured width on first call and caches it", () => {
    const ctx = makeFakeCtx("10px Inter", (t) => t.length * 5);
    expect(measureTextWidth(ctx, "hello")).toBe(25);
    expect(measureTextWidth(ctx, "hello")).toBe(25);
    // Second call must be served from cache: measureText invoked only once
    expect(ctx.measureText).toHaveBeenCalledTimes(1);
  });

  it("keys the cache by font: same text under a different font re-measures", () => {
    const ctx10 = makeFakeCtx("10px Inter", (t) => t.length * 5);
    const ctx12 = makeFakeCtx("12px Inter", (t) => t.length * 6);
    expect(measureTextWidth(ctx10, "abc")).toBe(15);
    expect(measureTextWidth(ctx12, "abc")).toBe(18);
  });

  it("caches different texts independently", () => {
    const ctx = makeFakeCtx("10px Inter", (t) => t.length * 5);
    expect(measureTextWidth(ctx, "PDH $100.00")).toBe(55);
    expect(measureTextWidth(ctx, "PDL $90.00")).toBe(50);
    expect(ctx.measureText).toHaveBeenCalledTimes(2);
  });
});