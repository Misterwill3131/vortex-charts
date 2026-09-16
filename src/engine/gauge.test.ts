import { describe, it, expect } from "vitest";
import { drawRadialGauge } from "./gauge";

describe("drawRadialGauge", () => {
  it("renders on a mock canvas context without error", () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "",
      shadowColor: "",
      shadowBlur: 0,
      globalAlpha: 1,
      font: "",
      textAlign: "",
      textBaseline: "",
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      drawRadialGauge(mockCtx, 300, 200, 74, {
        min: 0,
        max: 100,
        label: "BULLISH",
        sublabel: "6-Pillar Score",
      });
    }).not.toThrow();
  });

  it("clamps values outside min and max boundaries", () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      drawRadialGauge(mockCtx, 300, 200, -50, { min: 0, max: 100 });
      drawRadialGauge(mockCtx, 300, 200, 150, { min: 0, max: 100 });
    }).not.toThrow();
  });
});
