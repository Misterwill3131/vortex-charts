import { describe, it, expect } from "vitest";
import { computeVolumeProfile, drawVolumeProfile } from "./volume-profile";
import { computeBounds } from "./coordinates";
import type { Candle } from "../types";

describe("computeVolumeProfile", () => {
  it("returns null for empty candles or flat price range", () => {
    expect(computeVolumeProfile([])).toBeNull();
    expect(computeVolumeProfile([{ t: 100, open: 10, high: 10, low: 10, close: 10 }])).toBeNull();
  });

  it("calculates mathematically exact POC, VAH, and VAL", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { t: 2000, open: 105, high: 108, low: 98, close: 102, volume: 5000 },
    ];
    const profile = computeVolumeProfile(candles, 10, 0.7);
    expect(profile).not.toBeNull();
    if (!profile) return;

    expect(profile.bins.length).toBe(10);
    expect(profile.totalVolume).toBe(6000);
    // Bin 4 covers [98, 100] with center price 99
    expect(profile.pocPrice).toBe(99);
    expect(profile.valPrice).toBe(98);
    expect(profile.vahPrice).toBe(106);

    const pocBins = profile.bins.filter((b) => b.isPoc);
    expect(pocBins.length).toBe(1);

    const vaVolume = profile.bins
      .filter((b) => b.isValueArea)
      .reduce((acc, b) => acc + b.volume, 0);
    expect(vaVolume).toBeGreaterThanOrEqual(6000 * 0.7);
  });
});

describe("drawVolumeProfile", () => {
  it("draws volume profile horizontal bars and level lines without error", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    ];
    const profile = computeVolumeProfile(candles, 10)!;
    const bounds = computeBounds([85, 115], 500, 300);

    let saveCalled = false;
    let restoreCalled = false;
    let filledRects = 0;

    const ctx = {
      save: () => { saveCalled = true; },
      restore: () => { restoreCalled = true; },
      fillRect: () => { filledRects++; },
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      setLineDash: () => {},
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    drawVolumeProfile(ctx, profile, bounds, { showLines: true });
    expect(saveCalled).toBe(true);
    expect(restoreCalled).toBe(true);
    expect(filledRects).toBeGreaterThanOrEqual(10);
  });
});
