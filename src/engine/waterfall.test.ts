import { describe, it, expect } from "vitest";
import { drawWaterfallChart, type WaterfallBar } from "./waterfall";
import { computeBounds } from "./coordinates";

describe("drawWaterfallChart", () => {
  it("renders without error for valid waterfall bars with zero-inclusive bounds", () => {
    const bars: WaterfallBar[] = [
      { label: "Starting Cash", value: 100, isTotal: true },
      { label: "Sales", value: 40 },
      { label: "Costs", value: -25 },
      { label: "Ending Cash", value: 115, isTotal: true },
    ];

    const bounds = computeBounds([0, 150], 500, 300, { allowZeroOrNegative: true });

    let saved = false;
    let restored = false;
    let filledRects = 0;
    let strokedRects = 0;
    let strokes = 0;

    // Mock canvas context
    const ctx = {
      save: () => { saved = true; },
      restore: () => { restored = true; },
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => { strokes++; },
      fillRect: () => { filledRects++; },
      strokeRect: () => { strokedRects++; },
      fillText: () => {},
      setLineDash: () => {},
      measureText: () => ({ width: 30 }),
    } as unknown as CanvasRenderingContext2D;

    drawWaterfallChart(ctx, bars, bounds);
    expect(saved).toBe(true);
    expect(restored).toBe(true);
    expect(filledRects).toBe(4);
    expect(strokedRects).toBe(4);
    expect(strokes).toBeGreaterThanOrEqual(3); // connectors for i = 1, 2, 3
  });

  it("handles empty bars safely", () => {
    const bounds = computeBounds([0, 100], 500, 300, { allowZeroOrNegative: true });
    const ctx = {} as CanvasRenderingContext2D;
    expect(() => drawWaterfallChart(ctx, [], bounds)).not.toThrow();
  });
});
