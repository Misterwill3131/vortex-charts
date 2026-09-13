import { describe, it, expect } from "vitest";
import { computeBoxPlotStats, drawBoxPlot, type BoxPlotItem } from "./box-plot";
import { computeBounds } from "./coordinates";

describe("computeBoxPlotStats", () => {
  it("handles empty arrays gracefully with empty outliers array", () => {
    const stats = computeBoxPlotStats([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.median).toBe(0);
    expect(stats.outliers).toEqual([]);
  });

  it("calculates accurate 5-number summary for known odd-length series", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const stats = computeBoxPlotStats(values, "Odd");

    expect(stats.label).toBe("Odd");
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(9);
    expect(stats.median).toBe(5);
    expect(stats.q1).toBe(3);
    expect(stats.q3).toBe(7);
  });

  it("calculates accurate quantiles for even-length series", () => {
    const values = [2, 4, 6, 8];
    const stats = computeBoxPlotStats(values, "Even");
    expect(stats.median).toBe(5);
    expect(stats.q1).toBe(3.5);
    expect(stats.q3).toBe(6.5);
  });

  it("detects outliers beyond 1.5 IQR fences and truncates whisker max", () => {
    const values = [10, 11, 12, 10, 11, 12, 11, 100]; // 100 is clear outlier
    const stats = computeBoxPlotStats(values);
    expect(stats.outliers).toEqual([100]);
    // Whisker max must truncate to 12 (highest non-outlier), NOT 100
    expect(stats.max).toBe(12);
  });
});

describe("drawBoxPlot", () => {
  it("renders box plots and outliers without throwing", () => {
    const items: BoxPlotItem[] = [
      { label: "Asset A", min: 10, q1: 15, median: 20, q3: 25, max: 30, outliers: [45] },
    ];
    const bounds = computeBounds([5, 50], 400, 300);

    let saveCalled = false;
    let restoreCalled = false;

    const ctx = {
      save: () => { saveCalled = true; },
      restore: () => { restoreCalled = true; },
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    drawBoxPlot(ctx, items, bounds);
    expect(saveCalled).toBe(true);
    expect(restoreCalled).toBe(true);
  });
});
