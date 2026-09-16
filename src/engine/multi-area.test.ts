import { describe, it, expect } from "vitest";
import { drawMultiAreaChart, type MultiAreaSeries } from "./multi-area";
import { computeBounds } from "./coordinates";

describe("drawMultiAreaChart", () => {
  it("executes without errors on mock canvas context", () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      shadowColor: "",
      shadowBlur: 0,
      globalAlpha: 1,
      lineJoin: "",
      lineCap: "",
    } as unknown as CanvasRenderingContext2D;

    const series: MultiAreaSeries[] = [
      {
        name: "Calls",
        color: "#10b981",
        data: [{ y: 10 }, { y: 20 }, { y: 30 }],
      },
      {
        name: "Puts",
        color: "#ef4444",
        data: [{ y: 5 }, { y: 12 }, { y: 18 }],
      },
    ];

    const bounds = computeBounds([5, 30], 400, 200);

    expect(() => {
      drawMultiAreaChart(mockCtx, series, bounds, { smooth: true, glow: true });
    }).not.toThrow();
  });

  it("handles empty or single-point series gracefully", () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fill: () => {},
      stroke: () => {},
    } as unknown as CanvasRenderingContext2D;

    const bounds = computeBounds([0, 10], 400, 200);

    expect(() => {
      drawMultiAreaChart(mockCtx, [], bounds);
      drawMultiAreaChart(mockCtx, [{ name: "Single", color: "#38bdf8", data: [{ y: 5 }] }], bounds);
    }).not.toThrow();
  });
});
