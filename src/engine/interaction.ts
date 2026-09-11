import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";

export interface HoverState {
  mouseX: number;
  mouseY: number;
  index: number;
  candle: Candle | null;
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  hover: HoverState,
  cursorPrice: number,
  timeText: string
) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;

  const { mouseX, mouseY } = hover;

  if (mouseX < padding.left || mouseX > rightAxisX || mouseY < padding.top || mouseY > bottomAxisY) {
    return;
  }

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;

  // 1. Vertical Line
  ctx.beginPath();
  ctx.moveTo(mouseX + 0.5, padding.top);
  ctx.lineTo(mouseX + 0.5, bottomAxisY);
  ctx.stroke();

  // 2. Horizontal Line
  ctx.beginPath();
  ctx.moveTo(padding.left, mouseY + 0.5);
  ctx.lineTo(rightAxisX, mouseY + 0.5);
  ctx.stroke();

  // 3. Price badge on right axis
  ctx.setLineDash([]);
  ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const priceText = `$${formatPrice(cursorPrice)}`;
  const textW = ctx.measureText(priceText).width;
  const pillW = textW + 10;
  const pillH = 16;
  const pillX = rightAxisX + 4;
  const pillY = Math.round(mouseY - pillH / 2);

  ctx.fillStyle = "#38bdf8"; // Cyan highlight for active cursor
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 3);
  ctx.fill();

  ctx.fillStyle = "#020616";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceText, pillX + pillW / 2, pillY + pillH / 2);

  // 4. Time badge on bottom axis if timeText available
  if (timeText) {
    ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const timeW = ctx.measureText(timeText).width + 12;
    const timeH = 16;
    const timeX = Math.round(mouseX - timeW / 2);
    const timeY = bottomAxisY + 4;

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(timeX, timeY, timeW, timeH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f1f5f9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(timeText, timeX + timeW / 2, timeY + timeH / 2);
  }

  ctx.restore();
}
