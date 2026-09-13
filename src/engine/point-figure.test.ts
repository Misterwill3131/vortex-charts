import { describe, it, expect } from "vitest";
import { computePointAndFigure, drawPointAndFigure } from "./point-figure";
import { computeBounds } from "./coordinates";
import type { Candle } from "../types";

describe("computePointAndFigure", () => {
  it("returns empty array for empty candle data or invalid box size", () => {
    expect(computePointAndFigure([])).toEqual([]);
    expect(computePointAndFigure([{ t: 100, open: 10, high: 12, low: 9, close: 11 }], 0)).toEqual([]);
  });

  it("creates X column with exact price ladder as prices increase", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 104, low: 100, close: 104 },
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    expect(columns.length).toBe(1);
    expect(columns[0].type).toBe("X");
    expect(columns[0].boxes).toEqual([100, 101, 102, 103, 104]);
  });

  it("does not reverse on sub-threshold drop (< reversal count)", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 104, low: 100, close: 104 },
      { t: 3000, open: 104, high: 104, low: 102, close: 102 }, // drop of 2 boxes (< 3)
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    expect(columns.length).toBe(1);
    expect(columns[0].type).toBe("X");
  });

  it("creates O column on exact 3-box reversal with exact box ladder", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 104, low: 100, close: 104 },
      { t: 3000, open: 104, high: 104, low: 101, close: 101 }, // 3-box drop (104 down to 101)
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    expect(columns.length).toBe(2);
    expect(columns[0].type).toBe("X");
    expect(columns[0].boxes).toEqual([100, 101, 102, 103, 104]);
    expect(columns[1].type).toBe("O");
    expect(columns[1].boxes).toEqual([103, 102, 101]);
  });
});

describe("drawPointAndFigure", () => {
  it("renders X and O columns without throwing", () => {
    const candles: Candle[] = [
      { t: 1000, open: 100, high: 100, low: 100, close: 100 },
      { t: 2000, open: 100, high: 104, low: 100, close: 104 },
      { t: 3000, open: 104, high: 104, low: 101, close: 101 },
    ];
    const columns = computePointAndFigure(candles, 1.0, 3);
    const bounds = computeBounds([95, 110], 400, 300);

    let saveCalled = false;
    let restoreCalled = false;

    const ctx = {
      save: () => { saveCalled = true; },
      restore: () => { restoreCalled = true; },
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      strokeRect: () => {},
      measureText: () => ({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;

    drawPointAndFigure(ctx, columns, bounds, 1.0);
    expect(saveCalled).toBe(true);
    expect(restoreCalled).toBe(true);
  });
});
