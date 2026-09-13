import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

export interface LineSeriesPoint {
  x?: number;
  y?: number;
  price: number;
  t?: number;
  label?: string;
}

export interface DrawLineOptions {
  color?: string;
  lineWidth?: number;
  showArea?: boolean;
  areaTopOpacity?: number;
  showPoints?: boolean;
  pointRadius?: number;
  glow?: boolean;
  smooth?: boolean;
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
 * Pure Canvas 2D renderer for a continuous financial/quantitative line series.
 */
export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: LineSeriesPoint[],
  bounds: ChartBounds,
  options: DrawLineOptions = {}
): void {
  if (!data || data.length === 0) return;

  const {
    color = "#38bdf8",
    lineWidth = 2.5,
    showArea = true,
    areaTopOpacity = 0.35,
    showPoints = false,
    pointRadius = 3.5,
    glow = true,
    smooth = true,
  } = options;

  const total = data.length;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < total; i++) {
    const pt = data[i];
    const x = typeof pt.x === "number" ? pt.x : indexToX(i, total, bounds);
    const y = typeof pt.y === "number" ? pt.y : priceToY(pt.price, bounds);
    points.push({ x, y });
  }

  if (points.length < 2) {
    if (points.length === 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, pointRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  ctx.save();

  // 1. Area fill under curve with multi-stop glowing gradient
  if (showArea) {
    const bottomY = bounds.chartHeight - bounds.padding.bottom;
    if (typeof ctx.createLinearGradient === "function") {
      const gradient = ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY);
      gradient.addColorStop(0, colorWithAlpha(color, areaTopOpacity));
      gradient.addColorStop(0.5, colorWithAlpha(color, areaTopOpacity * 0.35));
      gradient.addColorStop(1, colorWithAlpha(color, 0.0));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colorWithAlpha(color, areaTopOpacity * 0.5);
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
  }

  // 2. Line stroke with neon glow
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
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

  // 3. Optional points
  if (showPoints) {
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#020616";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 4. Last point live beacon with concentric pulse halo
  const last = points[points.length - 1];
  
  // Outer halo
  ctx.beginPath();
  ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = colorWithAlpha(color, 0.25);
  ctx.fill();

  // Core dot
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
