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
    lineWidth = 2,
    showArea = true,
    areaTopOpacity = 0.25,
    showPoints = false,
    pointRadius = 3,
    glow = true,
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

  // 1. Area fill under curve
  if (showArea) {
    const bottomY = bounds.chartHeight - bounds.padding.bottom;
    const gradient = ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY);
    gradient.addColorStop(0, colorWithAlpha(color, areaTopOpacity));
    gradient.addColorStop(1, colorWithAlpha(color, 0.0));

    ctx.beginPath();
    ctx.moveTo(points[0].x, bottomY);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, bottomY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // 2. Line stroke with optional neon glow
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
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

  // Last point live beacon pulse marker
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}
