import type { PriceLine } from "../types";
import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";

export function drawPriceLines(
  ctx: CanvasRenderingContext2D,
  lines: PriceLine[],
  bounds: ChartBounds
) {
  const { chartWidth, padding, minPrice, maxPrice } = bounds;
  const rightAxisX = chartWidth - padding.right;

  ctx.save();

  lines.forEach((line) => {
    if (typeof line.price !== "number" || isNaN(line.price)) return;
    if (line.price < minPrice || line.price > maxPrice) return;

    const y = Math.round(priceToY(line.price, bounds));
    const lineWidth = line.lineWidth ?? 1;

    // Line dash pattern
    if (line.lineStyle === "dashed") {
      ctx.setLineDash([5, 4]);
    } else if (line.lineStyle === "dotted") {
      ctx.setLineDash([2, 3]);
    } else {
      ctx.setLineDash([]);
    }

    // 1. Draw horizontal line across the plot area
    ctx.strokeStyle = line.color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();

    // 2. Draw inline title tag near the right if title exists
    if (line.title) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const textWidth = ctx.measureText(line.title).width;
      const tagX = rightAxisX - textWidth - 10;
      const tagY = y - 7;

      // Small translucent background tag
      ctx.fillStyle = "rgba(2, 6, 22, 0.75)";
      ctx.fillRect(tagX - 4, tagY - 8, textWidth + 8, 14);

      ctx.fillStyle = line.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(line.title, tagX, tagY - 1);
      ctx.restore();
    }

    // 3. Draw badge pill on the right price scale if enabled
    if (line.axisLabelVisible !== false) {
      ctx.save();
      ctx.setLineDash([]);
      const labelText = formatPrice(line.price);
      ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const labelWidth = ctx.measureText(labelText).width;
      const pillWidth = labelWidth + 10;
      const pillHeight = 16;
      const pillX = rightAxisX + 4;
      const pillY = Math.round(y - pillHeight / 2);

      // Pill background
      ctx.fillStyle = line.color;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 3);
      ctx.fill();

      // Pill text (high contrast dark or white)
      ctx.fillStyle = "#020616";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, pillX + pillWidth / 2, pillY + pillHeight / 2);
      ctx.restore();
    }
  });

  ctx.restore();
}
