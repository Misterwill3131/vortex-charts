import { describe, it, expect } from "vitest";
import { drawPieChart, type PieSlice } from "./pie";
import { computeBounds } from "./coordinates";

describe("drawPieChart", () => {
  it("renders pie and donut slices without throwing", () => {
    const slices: PieSlice[] = [
      { label: "Long", value: 65, color: "#10b981" },
      { label: "Short", value: 35, color: "#f43f5e" },
    ];

    const bounds = computeBounds([0, 100], 400, 400);

    const ctx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 25 }),
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawPieChart(ctx, slices, bounds, { donutHole: 0.5 })).not.toThrow();
  });

  it("handles zero total value safely", () => {
    const bounds = computeBounds([0, 100], 400, 400);
    const ctx = {} as CanvasRenderingContext2D;
    expect(() => drawPieChart(ctx, [{ label: "Zero", value: 0 }], bounds)).not.toThrow();
  });
});
