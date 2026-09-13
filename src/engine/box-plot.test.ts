import { describe, it, expect } from "vitest";
import { computeBoxPlotStats } from "./box-plot";

describe("computeBoxPlotStats", () => {
  it("handles empty arrays gracefully", () => {
    const stats = computeBoxPlotStats([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.median).toBe(0);
  });

  it("calculates accurate 5-number summary for known series", () => {
    // 1, 2, 3, 4, 5, 6, 7, 8, 9
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const stats = computeBoxPlotStats(values, "Test");

    expect(stats.label).toBe("Test");
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(9);
    expect(stats.median).toBe(5);
    expect(stats.q1).toBe(3);
    expect(stats.q3).toBe(7);
  });

  it("detects outliers beyond 1.5 IQR fences", () => {
    const values = [10, 11, 12, 10, 11, 12, 11, 100]; // 100 is clear outlier
    const stats = computeBoxPlotStats(values);
    expect(stats.outliers).toBeDefined();
    expect(stats.outliers).toContain(100);
  });
});
