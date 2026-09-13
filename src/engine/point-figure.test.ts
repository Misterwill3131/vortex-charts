import { describe, it, expect } from "vitest";
import { computePointAndFigure } from "./point-figure";
import type { Candle } from "../types";

describe("computePointAndFigure", () => {
  it("returns empty array for empty candle data", () => {
    expect(computePointAndFigure([])).toEqual([]);
  });

  it("creates X column as prices increase", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 104, low: 100, close: 103 },
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    expect(columns.length).toBeGreaterThanOrEqual(1);
    expect(columns[0].type).toBe("X");
    expect(columns[0].boxes.length).toBeGreaterThanOrEqual(2);
  });

  it("creates O column on 3-box reversal", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 105, low: 100, close: 105 },
      { t: 3000, open: 105, high: 105, low: 100, close: 100 },
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    // After moving up to 105, a drop to 100 reverses 5 boxes (> 3 box reversal)
    expect(columns.length).toBe(2);
    expect(columns[0].type).toBe("X");
    expect(columns[1].type).toBe("O");
  });
});
