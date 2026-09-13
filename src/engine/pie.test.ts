import { describe, it, expect } from "vitest";
import { drawPieChart, type PieSlice } from "./pie";
import { computeBounds } from "./coordinates";

describe("drawPieChart", () => {
  it("renders donut slices with inner radius cutout", () => {
    const slices: PieSlice[] = [
      { label: "Long", value: 65, color: "#10b981" },
      { label: "Short", value: 35, color: "#f43f5e" },
    ];

    const bounds = computeBounds([10, 100], 400, 400);

    let saved = false;
    let restored = false;
    let fills = 0;
    let strokes = 0;

    const ctx = {
      save: () => { saved = true; },
      restore: () => { restored = true; },
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      closePath: () => {},
      fill: () => { fills++; },
      stroke: () => { strokes++; },
      fillText: () => {},
      measureText: () => ({ width: 25 }),
    } as unknown as CanvasRenderingContext2D;

    drawPieChart(ctx, slices, bounds, { donutHole: 0.5 });
    expect(saved).toBe(true);
    expect(restored).toBe(true);
    expect(fills).toBe(2);
    expect(strokes).toBe(2);
  });

  it("renders pure pie chart when donutHole is 0 using center lineTo", () => {
    const slices: PieSlice[] = [
      { label: "A", value: 50 },
      { label: "B", value: 50 },
    ];
    const bounds = computeBounds([10, 100], 400, 400);

    let lineToCalled = false;
    const ctx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => { lineToCalled = true; },
      arc: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 20 }),
    } as unknown as CanvasRenderingContext2D;

    drawPieChart(ctx, slices, bounds, { donutHole: 0 });
    expect(lineToCalled).toBe(true);
  });

  it("handles zero total value safely", () => {
    const bounds = computeBounds([10, 100], 400, 400);
    const ctx = {} as CanvasRenderingContext2D;
    expect(() => drawPieChart(ctx, [{ label: "Zero", value: 0 }], bounds)).not.toThrow();
  });
});
