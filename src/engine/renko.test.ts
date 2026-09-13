import { describe, it, expect } from "vitest";
import { computeRenkoBricks, drawRenkoBricks, type RenkoBrick } from "./renko";
import { computeBounds } from "./coordinates";
import type { Candle } from "../types";

describe("computeRenkoBricks", () => {
  it("returns empty array for empty candle data or invalid brick size", () => {
    expect(computeRenkoBricks([])).toEqual([]);
    expect(computeRenkoBricks([{ t: 100, open: 10, high: 12, low: 9, close: 11 }], 0)).toEqual([]);
    expect(computeRenkoBricks([{ t: 100, open: 10, high: 12, low: 9, close: 11 }], -1)).toEqual([]);
  });

  it("produces upward bricks when price advances by brick size symmetrically", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 102.5, low: 100, close: 102.5 },
    ];
    const bricks = computeRenkoBricks(candles, 1.0);
    expect(bricks.length).toBe(2);
    expect(bricks[0].isUp).toBe(true);
    expect(bricks[0].open).toBe(100);
    expect(bricks[0].close).toBe(101);
    expect(bricks[1].isUp).toBe(true);
    expect(bricks[1].open).toBe(101);
    expect(bricks[1].close).toBe(102);
  });

  it("produces downward bricks when price drops symmetrically", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 100, low: 97.5, close: 97.5 },
    ];
    const bricks = computeRenkoBricks(candles, 1.0);
    // Symmetric: 100 -> 97.5 emits 2 down bricks (100->99, 99->98)
    expect(bricks.length).toBe(2);
    expect(bricks[0].isUp).toBe(false);
    expect(bricks[0].open).toBe(100);
    expect(bricks[0].close).toBe(99);
    expect(bricks[1].isUp).toBe(false);
    expect(bricks[1].open).toBe(99);
    expect(bricks[1].close).toBe(98);
  });

  it("accurately handles reversal from uptrend to downtrend", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 103, low: 100, close: 103 },
      { t: 3000, open: 103, high: 103, low: 100.5, close: 100.5 },
    ];
    const bricks = computeRenkoBricks(candles, 1.0);
    expect(bricks.length).toBe(4);
    expect(bricks[0].isUp).toBe(true);
    expect(bricks[1].isUp).toBe(true);
    expect(bricks[2].isUp).toBe(true);
    expect(bricks[2].close).toBe(103);
    // Reversal down brick below last bottom (102 - 1 = 101)
    expect(bricks[3].isUp).toBe(false);
    expect(bricks[3].open).toBe(102);
    expect(bricks[3].close).toBe(101);
  });
});

describe("drawRenkoBricks", () => {
  it("renders renko bricks without leaking canvas state", () => {
    const bricks: RenkoBrick[] = [
      { open: 100, close: 101, high: 101, low: 100, isUp: true, t: 1000 },
      { open: 101, close: 100, high: 101, low: 100, isUp: false, t: 2000 },
    ];
    const bounds = computeBounds([95, 105], 400, 300);

    let saved = false;
    let restored = false;
    let rectsFilled = 0;
    let rectsStroked = 0;

    const ctx = {
      save: () => { saved = true; },
      restore: () => { restored = true; },
      fillRect: () => { rectsFilled++; },
      strokeRect: () => { rectsStroked++; },
    } as unknown as CanvasRenderingContext2D;

    drawRenkoBricks(ctx, bricks, bounds);
    expect(saved).toBe(true);
    expect(restored).toBe(true);
    expect(rectsFilled).toBe(2);
    expect(rectsStroked).toBe(2);
  });
});
