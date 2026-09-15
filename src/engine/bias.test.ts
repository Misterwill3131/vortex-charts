import { describe, it, expect } from "vitest";
import {
  computeBiasBounds,
  getBiasPointCoords,
  formatBiasTime,
  type WhaleBiasPoint,
} from "./bias";

describe("Whale Bias Engine", () => {
  it("computes fixed 0-100% bounds correctly", () => {
    const bounds = computeBiasBounds(400, 200);
    expect(bounds.minPrice).toBe(0);
    expect(bounds.maxPrice).toBe(100);
    expect(bounds.priceRange).toBe(100);
    expect(bounds.chartWidth).toBe(400);
    expect(bounds.chartHeight).toBe(200);
    expect(bounds.plotWidth).toBe(400 - bounds.padding.left - bounds.padding.right);
    expect(bounds.plotHeight).toBe(200 - bounds.padding.top - bounds.padding.bottom);
  });

  it("handles empty or single point lists gracefully", () => {
    const bounds = computeBiasBounds(400, 200);
    expect(getBiasPointCoords([], bounds)).toEqual([]);

    const single: WhaleBiasPoint[] = [{ scannedAt: 1700000000000, callPct: 65 }];
    const coords = getBiasPointCoords(single, bounds);
    expect(coords.length).toBe(1);
    expect(coords[0].x).toBe(bounds.padding.left);
  });

  it("maps chronological points linearly across plotWidth and clamps 0-100%", () => {
    const bounds = computeBiasBounds(400, 200);
    const points: WhaleBiasPoint[] = [
      { scannedAt: 1000, callPct: 0 },
      { scannedAt: 2000, callPct: 50 },
      { scannedAt: 3000, callPct: 100 },
    ];

    const coords = getBiasPointCoords(points, bounds);
    expect(coords.length).toBe(3);
    // First point at left plot boundary
    expect(coords[0].x).toBeCloseTo(bounds.padding.left, 1);
    // Middle point at exact center of plotWidth
    expect(coords[1].x).toBeCloseTo(bounds.padding.left + bounds.plotWidth / 2, 1);
    // Last point at right plot boundary
    expect(coords[2].x).toBeCloseTo(bounds.padding.left + bounds.plotWidth, 1);

    // Y values: 100% is top, 0% is bottom, 50% is center
    expect(coords[0].y).toBeCloseTo(bounds.padding.top + bounds.plotHeight, 1);
    expect(coords[1].y).toBeCloseTo(bounds.padding.top + bounds.plotHeight / 2, 1);
    expect(coords[2].y).toBeCloseTo(bounds.padding.top, 1);
  });

  it("formats bias timestamps properly", () => {
    const timeStr = formatBiasTime(Date.UTC(2026, 8, 15, 14, 30));
    expect(typeof timeStr).toBe("string");
    expect(timeStr.length).toBeGreaterThan(0);
  });
});
