import { describe, it, expect } from "vitest";
import { computeRenkoBricks } from "./renko";
import type { Candle } from "../types";

describe("computeRenkoBricks", () => {
  it("returns empty array for empty candle data or invalid brick size", () => {
    expect(computeRenkoBricks([])).toEqual([]);
    expect(computeRenkoBricks([{ t: 100, open: 10, high: 12, low: 9, close: 11 }], 0)).toEqual([]);
  });

  it("produces upward bricks when price advances by brick size", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 102.5, low: 100, close: 102.5 },
    ];
    const bricks = computeRenkoBricks(candles, 1.0);
    // Initial ref top 100, moves to 102.5 -> 2 up bricks (100->101, 101->102)
    expect(bricks.length).toBe(2);
    expect(bricks[0].isUp).toBe(true);
    expect(bricks[0].open).toBe(100);
    expect(bricks[0].close).toBe(101);
    expect(bricks[1].isUp).toBe(true);
    expect(bricks[1].open).toBe(101);
    expect(bricks[1].close).toBe(102);
  });

  it("produces downward bricks when price drops below threshold", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 100, low: 97.5, close: 97.5 },
    ];
    const bricks = computeRenkoBricks(candles, 1.0);
    expect(bricks.length).toBeGreaterThan(0);
    expect(bricks[0].isUp).toBe(false);
    expect(bricks[0].close).toBeLessThan(bricks[0].open);
  });
});
