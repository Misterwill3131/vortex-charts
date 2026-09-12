import { describe, it, expect } from "vitest";
import { computeBounds, priceToY, yToPrice, indexToX, xToIndex, DEFAULT_PADDING } from "./coordinates";

describe("computeBounds", () => {
  it("computes padded bounds from a normal price series", () => {
    const bounds = computeBounds([100, 110], 600, 300);
    expect(bounds.minPrice).toBeLessThan(100);
    expect(bounds.maxPrice).toBeGreaterThan(110);
    expect(bounds.priceRange).toBe(bounds.maxPrice - bounds.minPrice);
    expect(bounds.plotWidth).toBe(600 - DEFAULT_PADDING.left - DEFAULT_PADDING.right);
    expect(bounds.plotHeight).toBe(300 - DEFAULT_PADDING.top - DEFAULT_PADDING.bottom);
  });

  it("dilates a flat series (min === max) instead of dividing by zero", () => {
    const bounds = computeBounds([50, 50, 50], 600, 300);
    expect(bounds.minPrice).toBeLessThan(50);
    expect(bounds.maxPrice).toBeGreaterThan(50);
    expect(bounds.priceRange).toBeGreaterThan(0);
  });

  it("falls back to default window on empty or invalid prices", () => {
    const bounds = computeBounds([], 600, 300);
    expect(bounds.minPrice).toBeLessThan(100);
    expect(bounds.maxPrice).toBeGreaterThan(105);

    const nanBounds = computeBounds([NaN, NaN, Infinity, -Infinity, 0], 600, 300);
    expect(nanBounds.minPrice).toBeLessThan(100);
    expect(nanBounds.maxPrice).toBeGreaterThan(105);
  });

  it("rejects Infinity prices without corrupting the scale", () => {
    const bounds = computeBounds([100, 110, Infinity], 600, 300);
    expect(bounds.maxPrice).toBeLessThan(200);
    expect(Number.isFinite(bounds.minPrice)).toBe(true);
    expect(Number.isFinite(bounds.maxPrice)).toBe(true);
  });

  it("survives very large arrays (no spread call-stack overflow)", () => {
    const prices = new Array(200_000).fill(0).map((_, i) => 100 + (i % 500));
    const bounds = computeBounds(prices, 600, 300);
    // The point of this test: no RangeError, finite sane scale
    expect(Number.isFinite(bounds.minPrice)).toBe(true);
    expect(Number.isFinite(bounds.maxPrice)).toBe(true);
    expect(bounds.minPrice).toBeLessThan(101); // raw min is 100
    expect(bounds.maxPrice).toBeGreaterThan(598); // raw max is 599
  });

  it("enforces a minimum plot size on tiny containers", () => {
    const bounds = computeBounds([100, 110], 0, 0);
    expect(bounds.plotWidth).toBeGreaterThanOrEqual(10);
    expect(bounds.plotHeight).toBeGreaterThanOrEqual(10);
  });
});

describe("coordinate round-trips", () => {
  it("priceToY and yToPrice are exact inverses across the range", () => {
    const bounds = computeBounds([100, 200], 600, 300);
    for (const price of [100, 125, 150, 175, 200]) {
      const y = priceToY(price, bounds);
      expect(yToPrice(y, bounds)).toBeCloseTo(price, 6);
    }
  });

  it("higher prices map to smaller Y (screen orientation)", () => {
    const bounds = computeBounds([100, 200], 600, 300);
    expect(priceToY(200, bounds)).toBeLessThan(priceToY(100, bounds));
  });

  it("priceToY is guarded against zero price range", () => {
    const bounds = { ...computeBounds([100, 200], 600, 300), priceRange: 0 };
    const y = priceToY(150, bounds);
    expect(Number.isFinite(y)).toBe(true);
  });

  it("xToIndex clamps outside values into the valid index range", () => {
    const bounds = computeBounds([100, 200], 600, 300);
    const count = 10;
    expect(xToIndex(-50, count, bounds)).toBe(0);
    expect(xToIndex(10_000, count, bounds)).toBe(count - 1);
  });

  it("indexToX centers a single candle in the plot area", () => {
    const bounds = computeBounds([100, 200], 600, 300);
    const x = indexToX(0, 1, bounds);
    const mid = bounds.padding.left + bounds.plotWidth / 2;
    expect(x).toBeCloseTo(mid, 6);
  });
});