import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

export interface AreaDataPoint {
  x?: number;
  y: number;
  label?: string;
}

export interface DrawAreaOptions {
  color?: string;
  gradientTopOpacity?: number;
  gradientBottomOpacity?: number;
  lineWidth?: number;
  showLine?: boolean;
}

/**
 * Pure Canvas 2D renderer for Area Charts.
 */
export function drawAreaChart(
  ctx: CanvasRenderingContext2D,
  data: AreaDataPoint[],
  bounds: ChartBounds,
  options: DrawAreaOptions = {}
): void {
  if (!data || data.length < 2) return;

  const {
    color = "#38bdf8",
    gradientTopOpacity = 0.45,
    gradientBottomOpacity = 0.02,
    lineWidth = 2,
    showLine = true,
  } = options;

  const count = data.length;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const pt = data[i];
    const x = typeof pt.x === "number" ? pt.x : indexToX(i, count, bounds);
    const y = priceToY(pt.y, bounds);
    points.push({ x, y });
  }

  const bottomY = bounds.chartHeight - bounds.padding.bottom;

  ctx.save();

  // 1. Fill Area with gradient
  const gradient = ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY);
  gradient.addColorStop(0, colorWithAlpha(color, gradientTopOpacity));
  gradient.addColorStop(1, colorWithAlpha(color, gradientBottomOpacity));

  ctx.beginPath();
  ctx.moveTo(points[0].x, bottomY);
  ctx.lineTo(points[0].x, points[0].y);

  // Smooth bezier curve through points
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
  }

  ctx.lineTo(points[points.length - 1].x, bottomY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 2. Stroke outline line
  if (showLine) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(midX, prev.y, midX, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}
