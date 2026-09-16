import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";
import type { AreaDataPoint } from "./area";

export interface MultiAreaSeries {
  name: string;
  color: string;
  data: (AreaDataPoint | number)[];
  gradientTopOpacity?: number;
  gradientBottomOpacity?: number;
  lineWidth?: number;
  smooth?: boolean;
}

export interface DrawMultiAreaOptions {
  smooth?: boolean;
  glow?: boolean;
}

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
 * Pure Canvas 2D renderer for multiple overlapping area series.
 */
export function drawMultiAreaChart(
  ctx: CanvasRenderingContext2D,
  seriesList: MultiAreaSeries[],
  bounds: ChartBounds,
  options: DrawMultiAreaOptions = {}
): void {
  if (!seriesList || seriesList.length === 0) return;

  const { smooth = true, glow = true } = options;
  const bottomY = bounds.chartHeight - bounds.padding.bottom;

  seriesList.forEach((s) => {
    const data = s.data;
    if (!data || data.length < 2) return;

    const count = data.length;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      const item = data[i];
      const yVal = typeof item === "number" ? item : item.y;
      const x = typeof item === "object" && typeof item.x === "number" ? item.x : indexToX(i, count, bounds);
      const y = priceToY(yVal, bounds);
      points.push({ x, y });
    }

    const topOpacity = s.gradientTopOpacity ?? 0.35;
    const bottomOpacity = s.gradientBottomOpacity ?? 0.02;
    const lineWidth = s.lineWidth ?? 2;

    ctx.save();

    // 1. Fill Area with multi-stop gradient
    if (typeof ctx.createLinearGradient === "function") {
      const gradient = ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY);
      gradient.addColorStop(0, colorWithAlpha(s.color, topOpacity));
      gradient.addColorStop(0.6, colorWithAlpha(s.color, topOpacity * 0.4));
      gradient.addColorStop(1, colorWithAlpha(s.color, bottomOpacity));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colorWithAlpha(s.color, topOpacity * 0.5);
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
    if (glow) {
      ctx.shadowColor = s.color;
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
    ctx.strokeStyle = s.color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Live beacon on end point
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(s.color, 0.25);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  });
}
