import { describe, it, expect } from "vitest";
import { computeHeikinAshi } from "./heikin-ashi";
import type { Candle } from "../types";

describe("computeHeikinAshi", () => {
  it("returns empty array for empty input", () => {
    expect(computeHeikinAshi([])).toEqual([]);
  });

  it("calculates first Heikin-Ashi candle correctly", () => {
    const raw: Candle[] = [
      { t: 1000, open: 10, high: 15, low: 8, close: 12, volume: 100 },
    ];
    const ha = computeHeikinAshi(raw);
    expect(ha.length).toBe(1);
    expect(ha[0].open).toBe((10 + 12) / 2); // 11
    expect(ha[0].close).toBe((10 + 15 + 8 + 12) / 4); // 11.25
    expect(ha[0].high).toBe(15);
    expect(ha[0].low).toBe(8);
  });

  it("calculates subsequent Heikin-Ashi candles based on previous open/close", () => {
    const raw: Candle[] = [
      { t: 1000, open: 10, high: 15, low: 8, close: 12 },
      { t: 2000, open: 12, high: 18, low: 11, close: 16 },
    ];
    const ha = computeHeikinAshi(raw);
    expect(ha.length).toBe(2);

    const prevOpen = (10 + 12) / 2; // 11
    const prevClose = (10 + 15 + 8 + 12) / 4; // 11.25
    const expectedSecondOpen = (prevOpen + prevClose) / 2; // 11.125
    const expectedSecondClose = (12 + 18 + 11 + 16) / 4; // 14.25

    expect(ha[1].open).toBeCloseTo(expectedSecondOpen, 5);
    expect(ha[1].close).toBeCloseTo(expectedSecondClose, 5);
    expect(ha[1].high).toBe(Math.max(18, expectedSecondOpen, expectedSecondClose));
    expect(ha[1].low).toBe(Math.min(11, expectedSecondOpen, expectedSecondClose));
  });
});
