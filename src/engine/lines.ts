import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";

export interface DataPoint {
  x: number;
  price: number;
}

export interface LineOptions {
  color: string;
  lineWidth?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
  fillGradient?: boolean;
  gradientColorTop?: string;
  gradientColorBottom?: string;
}

export function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  points: DataPoint[],
  bounds: ChartBounds,
  options: LineOptions
) {
  if (points.length < 2) return;

  const { chartHeight, padding } = bounds;
  const bottomAxisY = chartHeight - padding.bottom;

  ctx.save();

  // 1. Draw area gradient fill underneath if enabled
  if (options.fillGradient) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, bottomAxisY);
    gradient.addColorStop(0, options.gradientColorTop || "rgba(56, 189, 248, 0.20)");
    gradient.addColorStop(1, options.gradientColorBottom || "rgba(56, 189, 248, 0.00)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, bottomAxisY);
    points.forEach((pt) => {
      const y = priceToY(pt.price, bounds);
      ctx.lineTo(pt.x, y);
    });
    ctx.lineTo(points[points.length - 1].x, bottomAxisY);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Draw line stroke
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth ?? 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (options.lineStyle === "dashed") {
    ctx.setLineDash([5, 4]);
  } else if (options.lineStyle === "dotted") {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  points.forEach((pt, idx) => {
    const y = priceToY(pt.price, bounds);
    if (idx === 0) {
      ctx.moveTo(pt.x, y);
    } else {
      ctx.lineTo(pt.x, y);
    }
  });
  ctx.stroke();

  ctx.restore();
}
