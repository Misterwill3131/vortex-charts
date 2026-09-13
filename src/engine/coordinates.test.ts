import { describe, it, expect } from "vitest";
import {
  computeBounds,
  priceToY,
  yToPrice,
  indexToX,
  xToIndex,
  timeToX,
  xToTime,
  nearestTimeIndex,
  DEFAULT_PADDING,
} from "./coordinates";

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

  it("stretches and compresses vertical price bounds with factor", () => {
    const baseBounds = computeBounds([100, 200], 600, 300);
    const baseRange = baseBounds.priceRange;

    // factor > 1 compresses visible range (zoom in on price)
    const zoomedIn = computeBounds([100, 200], 600, 300, { factor: 2.0 });
    expect(zoomedIn.priceRange).toBeCloseTo(baseRange / 2, 4);

    // factor < 1 stretches visible range (zoom out on price)
    const zoomedOut = computeBounds([100, 200], 600, 300, { factor: 0.5 });
    expect(zoomedOut.priceRange).toBeCloseTo(baseRange * 2, 4);

    // Centers remain consistent
    const baseCenter = (baseBounds.minPrice + baseBounds.maxPrice) / 2;
    const inCenter = (zoomedIn.minPrice + zoomedIn.maxPrice) / 2;
    expect(inCenter).toBeCloseTo(baseCenter, 4);
  });

  it("shifts vertical price bounds with offset", () => {
    const baseBounds = computeBounds([100, 200], 600, 300);
    const shifted = computeBounds([100, 200], 600, 300, { offset: 15 });

    expect(shifted.minPrice).toBeCloseTo(baseBounds.minPrice + 15, 4);
    expect(shifted.maxPrice).toBeCloseTo(baseBounds.maxPrice + 15, 4);
    expect(shifted.priceRange).toBeCloseTo(baseBounds.priceRange, 4);
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

describe("time scale mapping", () => {
  const DAY = 86_400_000;
  const bounds = computeBounds([100, 200], 600, 300);

  it("timeToX and xToTime are exact inverses", () => {
    const scale = { tMin: 0, tMax: 10 * DAY };
    for (const days of [0, 2.5, 5, 7.5, 10]) {
      const t = days * DAY;
      const x = timeToX(t, scale, bounds);
      expect(xToTime(x, scale, bounds)).toBeCloseTo(t, 6);
    }
  });

  it("later timestamps map further right", () => {
    const scale = { tMin: 0, tMax: 10 * DAY };
    expect(timeToX(2 * DAY, scale, bounds)).toBeLessThan(timeToX(8 * DAY, scale, bounds));
  });

  it("clamps to the plot center when the time span is zero", () => {
    const scale = { tMin: 5 * DAY, tMax: 5 * DAY };
    const x = timeToX(9 * DAY, scale, bounds);
    expect(x).toBeCloseTo(bounds.padding.left + bounds.plotWidth / 2, 6);
  });

  it("renders proportional gaps: a 3-day hole is 3x wider than a 1-day step", () => {
    const t0 = 0;
    const t1 = DAY;
    const t3 = 4 * DAY; // 3-day gap after t1
    const scale = { tMin: t0, tMax: t3 };
    const x0 = timeToX(t0, scale, bounds);
    const x1 = timeToX(t1, scale, bounds);
    const x3 = timeToX(t3, scale, bounds);
    expect(x1 - x0).toBeGreaterThan(0);
    expect((x3 - x1) / (x1 - x0)).toBeCloseTo(3, 6);
  });
});

describe("nearestTimeIndex (binary search)", () => {
  const DAY = 86_400_000;
  const items = [0, 1, 2, 3, 4, 5].map((d) => ({ t: d * DAY }));

  it("finds exact matches", () => {
    expect(nearestTimeIndex(items, 3 * DAY)).toBe(3);
  });

  it("finds the nearest item between two timestamps", () => {
    expect(nearestTimeIndex(items, 3.4 * DAY)).toBe(3);
    expect(nearestTimeIndex(items, 3.6 * DAY)).toBe(4);
  });

  it("clamps before the first and after the last timestamp", () => {
    expect(nearestTimeIndex(items, -5 * DAY)).toBe(0);
    expect(nearestTimeIndex(items, 99 * DAY)).toBe(items.length - 1);
  });

  it("returns -1 on an empty array", () => {
    expect(nearestTimeIndex([], 123)).toBe(-1);
  });

  it("handles a single item", () => {
    expect(nearestTimeIndex([{ t: 42 }], 1000)).toBe(0);
  });
});