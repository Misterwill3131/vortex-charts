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
  smooth?: boolean;
  glow?: boolean;
}

/**
 * Traces a smooth Catmull-Rom to Cubic Bezier spline path through points.
 */
function traceSmoothSpline(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  if (points.length < 2) return;
  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
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
    gradientTopOpacity = 0.4,
    gradientBottomOpacity = 0.0,
    lineWidth = 2.5,
    showLine = true,
    smooth = true,
    glow = true,
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

  // 1. Fill Area with multi-stop gradient
  const gradient = typeof ctx.createLinearGradient === "function" ? ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY) : null;
  if (gradient) {
    gradient.addColorStop(0, colorWithAlpha(color, gradientTopOpacity));
    gradient.addColorStop(0.5, colorWithAlpha(color, gradientTopOpacity * 0.35));
    gradient.addColorStop(1, colorWithAlpha(color, gradientBottomOpacity));
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = colorWithAlpha(color, gradientTopOpacity * 0.5);
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, bottomY);
  ctx.lineTo(points[0].x, points[0].y);

  if (smooth) {
    traceSmoothSpline(ctx, points);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }

  ctx.lineTo(points[points.length - 1].x, bottomY);
  ctx.closePath();
  ctx.fill();

  // 2. Stroke outline line with glow
  if (showLine) {
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    if (smooth) {
      traceSmoothSpline(ctx, points);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3. Live beacon on end point
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = colorWithAlpha(color, 0.25);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
