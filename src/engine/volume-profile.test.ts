import { describe, it, expect } from "vitest";
import { computeVolumeProfile } from "./volume-profile";
import type { Candle } from "../types";

describe("computeVolumeProfile", () => {
  it("returns null for empty candles", () => {
    expect(computeVolumeProfile([])).toBeNull();
  });

  it("calculates correct number of bins and identifies POC", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { t: 2000, open: 105, high: 108, low: 98, close: 102, volume: 5000 },
    ];
    const profile = computeVolumeProfile(candles, 10, 0.7);
    expect(profile).not.toBeNull();
    if (!profile) return;

    expect(profile.bins.length).toBe(10);
    expect(profile.totalVolume).toBe(6000);
    expect(profile.pocPrice).toBeGreaterThanOrEqual(90);
    expect(profile.pocPrice).toBeLessThanOrEqual(110);
    expect(profile.vahPrice).toBeGreaterThanOrEqual(profile.valPrice);

    const pocBins = profile.bins.filter((b) => b.isPoc);
    expect(pocBins.length).toBe(1);
  });
});
