import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";
import { measureTextWidth } from "./text-cache";

export interface SessionBoxData {
  high: number;
  low: number;
  mid: number;
  color: string;
  fillColor?: string;
  prefix: string; // e.g. "PD" (Prior-Day) or "PM" (Premarket)
}

export function drawSessionBox(
  ctx: CanvasRenderingContext2D,
  box: SessionBoxData,
  bounds: ChartBounds
) {
  if (box.high <= 0 || box.low <= 0) return;

  const { chartWidth, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;

  const yHigh = Math.round(priceToY(box.high, bounds));
  const yLow = Math.round(priceToY(box.low, bounds));
  const yMid = Math.round(priceToY(box.mid, bounds));

  ctx.save();

  // 1. Shaded range area
  ctx.fillStyle = box.fillColor || "rgba(234, 179, 8, 0.04)";
  ctx.fillRect(padding.left, yHigh, rightAxisX - padding.left, yLow - yHigh);

  // 2. High line (Dashed)
  ctx.strokeStyle = box.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);

  ctx.beginPath();
  ctx.moveTo(padding.left, yHigh + 0.5);
  ctx.lineTo(rightAxisX, yHigh + 0.5);
  ctx.stroke();

  // 3. Low line (Dashed)
  ctx.beginPath();
  ctx.moveTo(padding.left, yLow + 0.5);
  ctx.lineTo(rightAxisX, yLow + 0.5);
  ctx.stroke();

  // 4. Mid line (Dotted)
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = box.color;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(padding.left, yMid + 0.5);
  ctx.lineTo(rightAxisX, yMid + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // 5. Right axis badges
  ctx.setLineDash([]);
  ctx.font = "bold 9px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // High Badge
  const highText = `${box.prefix}H $${formatPrice(box.high)}`;
  const highW = measureTextWidth(ctx, highText) + 8;
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(rightAxisX + 3, yHigh - 7, highW, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.fillText(highText, rightAxisX + 3 + highW / 2, yHigh);

  // Low Badge
  const lowText = `${box.prefix}L $${formatPrice(box.low)}`;
  const lowW = measureTextWidth(ctx, lowText) + 8;
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(rightAxisX + 3, yLow - 7, lowW, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.fillText(lowText, rightAxisX + 3 + lowW / 2, yLow);

  ctx.restore();
}
