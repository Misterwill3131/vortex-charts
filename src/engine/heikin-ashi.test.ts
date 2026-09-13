import { describe, it, expect } from "vitest";
import { computeHeikinAshi } from "./heikin-ashi";
import type { Candle } from "../types";

describe("computeHeikinAshi", () => {
  it("returns empty array for empty or nullish input", () => {
    expect(computeHeikinAshi([])).toEqual([]);
    expect(computeHeikinAshi(null as unknown as Candle[])).toEqual([]);
    expect(computeHeikinAshi(undefined as unknown as Candle[])).toEqual([]);
  });

  it("calculates first Heikin-Ashi candle correctly and preserves timestamp and volume", () => {
    const raw: Candle[] = [
      { t: 1600000000, open: 10, high: 15, low: 8, close: 12, volume: 5500 },
    ];
    const ha = computeHeikinAshi(raw);
    expect(ha.length).toBe(1);
    expect(ha[0].t).toBe(1600000000);
    expect(ha[0].volume).toBe(5500);
    expect(ha[0].open).toBe((10 + 12) / 2); // 11
    expect(ha[0].close).toBe((10 + 15 + 8 + 12) / 4); // 11.25
    expect(ha[0].high).toBe(15);
    expect(ha[0].low).toBe(8);
  });

  it("calculates subsequent Heikin-Ashi candles and correctly handles gap-down overrides", () => {
    const raw: Candle[] = [
      { t: 1000, open: 100, high: 105, low: 95, close: 100 }, // haOpen=100, haClose=100
      { t: 2000, open: 50, high: 55, low: 45, close: 50 },    // haOpen = (100+100)/2 = 100
    ];
    const ha = computeHeikinAshi(raw);
    expect(ha.length).toBe(2);
    expect(ha[1].open).toBe(100);
    // In a sharp gap down, haOpen (100) exceeds curr.high (55), so haHigh MUST take haOpen (100)
    expect(ha[1].high).toBe(100);
    expect(ha[1].low).toBe(45);
  });
});
