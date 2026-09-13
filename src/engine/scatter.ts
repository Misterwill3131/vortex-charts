import type { ChartBounds } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

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
  hoveredIndex?: number | null;
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

  // Add 10% padding
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  return {
    minX: minX - spanX * 0.1,
    maxX: maxX + spanX * 0.1,
    minY: minY - spanY * 0.1,
    maxY: maxY + spanY * 0.1,
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
    defaultRadius = 6,
    showTrendLine = false,
    trendLineColor = "#38bdf8",
    glow = true,
    hoveredIndex = null,
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

  // 1. Optional linear regression trendline with neon glow
  if (showTrendLine && points.length >= 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const denom = n * sumXX - sumX * sumX;
    ctx.strokeStyle = trendLineColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = trendLineColor;
    ctx.shadowBlur = 6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();

    if (Math.abs(denom) < 0.00001) {
      const vx = mapX(points[0].x);
      ctx.moveTo(vx, mapY(minY));
      ctx.lineTo(vx, mapY(maxY));
    } else {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      const x1 = minX;
      const y1 = slope * x1 + intercept;
      const x2 = maxX;
      const y2 = slope * x2 + intercept;
      ctx.moveTo(mapX(x1), mapY(y1));
      ctx.lineTo(mapX(x2), mapY(y2));
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  // 2. Draw Points / Bubbles
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const px = mapX(p.x);
    const py = mapY(p.y);
    const radius = p.size ? Math.max(3, p.size) : defaultRadius;
    const color = p.color || pointColor;
    const isHovered = hoveredIndex === i;

    // Projected guide lines if hovered
    if (isHovered) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Down to X axis
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, bounds.chartHeight - bounds.padding.bottom);
      ctx.stroke();

      // Right to Y axis
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bounds.chartWidth - bounds.padding.right, py);
      ctx.stroke();

      ctx.setLineDash([]);

      // Glow halo
      ctx.beginPath();
      ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(color, 0.25);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(px, py, isHovered ? radius + 1.5 : radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = isHovered ? 12 : 6;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke();

    // Bubble label
    if (p.label) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.label, px, py - radius - 4);
    }
  }

  ctx.restore();
}
