import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";

export function drawGridAndAxes(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  timeLabels: { x: number; text: string }[],
  tickCount: number = 5
) {
  const { chartWidth, chartHeight, plotWidth, padding, minPrice, maxPrice, priceRange } = bounds;

  ctx.save();

  // ── Vertical separator between chart and right price scale ──────────
  const rightAxisX = chartWidth - padding.right;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightAxisX + 0.5, padding.top);
  ctx.lineTo(rightAxisX + 0.5, chartHeight - padding.bottom);
  ctx.stroke();

  // ── Horizontal separator between chart and bottom time scale ────────
  const bottomAxisY = chartHeight - padding.bottom;
  ctx.beginPath();
  ctx.moveTo(padding.left, bottomAxisY + 0.5);
  ctx.lineTo(chartWidth, bottomAxisY + 0.5);
  ctx.stroke();

  // ── Horizontal Grid Lines & Price Ticks ─────────────────────────────
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillStyle = "#71717a";
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const step = priceRange / (tickCount + 1);
  for (let i = 1; i <= tickCount; i++) {
    const price = minPrice + i * step;
    const y = Math.round(priceToY(price, bounds));

    // Dotted line across plot area
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();

    // Price label on right margin
    ctx.fillText(formatPrice(price), rightAxisX + 8, y);
  }

  // ── Bottom Time Ticks ───────────────────────────────────────────────
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const item of timeLabels) {
    if (item.x >= padding.left && item.x <= rightAxisX) {
      // Subtle tick mark
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(item.x + 0.5, bottomAxisY);
      ctx.lineTo(item.x + 0.5, bottomAxisY + 4);
      ctx.stroke();

      // Label text
      ctx.fillText(item.text, item.x, bottomAxisY + 7);
    }
  }

  ctx.restore();
}
