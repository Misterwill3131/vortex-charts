import type { ChartBounds } from "./coordinates";

export interface ScatterPoint {
  x: number;
  y: number;
  size?: number;
  color?: string;
  label?: string;
}

export interface DrawScatterOptions {
  pointColor?: string;
  defaultRadius?: number;
  showTrendLine?: boolean;
  trendLineColor?: string;
  glow?: boolean;
}

export interface ScatterBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Computes min/max bounds for Cartesian X/Y scatter data.
 */
export function computeScatterBounds(points: ScatterPoint[]): ScatterBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  if (!isFinite(minX)) minX = 0;
  if (!isFinite(maxX)) maxX = 100;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxY)) maxY = 100;

  // Add 8% padding
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  return {
    minX: minX - spanX * 0.08,
    maxX: maxX + spanX * 0.08,
    minY: minY - spanY * 0.08,
    maxY: maxY + spanY * 0.08,
  };
}

/**
 * Pure Canvas 2D renderer for Scatter Plots / Bubble Charts.
 */
export function drawScatterPlot(
  ctx: CanvasRenderingContext2D,
  points: ScatterPoint[],
  bounds: ChartBounds,
  scatterBounds: ScatterBounds,
  options: DrawScatterOptions = {}
): void {
  if (!points || points.length === 0) return;

  const {
    pointColor = "#38bdf8",
    defaultRadius = 5,
    showTrendLine = false,
    trendLineColor = "rgba(255, 255, 255, 0.4)",
    glow = true,
  } = options;

  const { minX, maxX, minY, maxY } = scatterBounds;
  const rangeX = Math.max(maxX - minX, 0.0001);
  const rangeY = Math.max(maxY - minY, 0.0001);

  function mapX(xVal: number): number {
    const ratio = (xVal - minX) / rangeX;
    return bounds.padding.left + ratio * bounds.plotWidth;
  }

  function mapY(yVal: number): number {
    const ratio = (yVal - minY) / rangeY;
    return bounds.padding.top + bounds.plotHeight * (1 - ratio);
  }

  ctx.save();

  // 1. Optional linear regression trendline
  if (showTrendLine && points.length >= 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const slope = (n * sumXY - sumX * sumY) / Math.max(0.0001, n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const x1 = minX;
    const y1 = slope * x1 + intercept;
    const x2 = maxX;
    const y2 = slope * x2 + intercept;

    ctx.strokeStyle = trendLineColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(mapX(x1), mapY(y1));
    ctx.lineTo(mapX(x2), mapY(y2));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Draw Points / Bubbles
  if (glow) {
    ctx.shadowColor = pointColor;
    ctx.shadowBlur = 6;
  }

  for (const p of points) {
    const px = mapX(p.x);
    const py = mapY(p.y);
    const radius = p.size ? Math.max(2, p.size) : defaultRadius;
    const color = p.color || pointColor;

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}
