import { describe, it, expect } from "vitest";
import { drawWaterfallChart, type WaterfallBar } from "./waterfall";
import { computeBounds } from "./coordinates";

describe("drawWaterfallChart", () => {
  it("renders without error for valid waterfall bars", () => {
    const bars: WaterfallBar[] = [
      { label: "Starting Cash", value: 100, isTotal: true },
      { label: "Sales", value: 40 },
      { label: "Costs", value: -25 },
      { label: "Ending Cash", value: 115, isTotal: true },
    ];

    const bounds = computeBounds([0, 150], 500, 300);

    // Mock canvas context
    const ctx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      setLineDash: () => {},
      measureText: () => ({ width: 30 }),
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawWaterfallChart(ctx, bars, bounds)).not.toThrow();
  });

  it("handles empty bars safely", () => {
    const bounds = computeBounds([0, 100], 500, 300);
    const ctx = {} as CanvasRenderingContext2D;
    expect(() => drawWaterfallChart(ctx, [], bounds)).not.toThrow();
  });
});
