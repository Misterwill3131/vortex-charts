import type { ChartBounds } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";
import { measureTextWidth } from "./text-cache";

export interface RulerPoint {
  x: number;
  y: number;
  price: number;
  time?: number;
  index: number;
}

export interface RulerState {
  active: boolean;
  startPoint: RulerPoint | null;
  currentPoint: RulerPoint | null;
}

export function drawRulerOverlay(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  ruler: RulerState
) {
  if (!ruler.active || !ruler.startPoint || !ruler.currentPoint) return;

  const { startPoint, currentPoint } = ruler;
  const { padding, chartWidth, chartHeight } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;

  const x1 = Math.max(padding.left, Math.min(rightAxisX, startPoint.x));
  const y1 = Math.max(padding.top, Math.min(bottomAxisY, startPoint.y));
  const x2 = Math.max(padding.left, Math.min(rightAxisX, currentPoint.x));
  const y2 = Math.max(padding.top, Math.min(bottomAxisY, currentPoint.y));

  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectW = Math.max(2, Math.abs(x2 - x1));
  const rectH = Math.max(2, Math.abs(y2 - y1));

  const priceDiff = currentPoint.price - startPoint.price;
  const pricePct = startPoint.price > 0 ? (priceDiff / startPoint.price) * 100 : 0;
  const barsCount = Math.abs(currentPoint.index - startPoint.index);
  const isPositive = priceDiff >= 0;

  const accentColor = isPositive ? "#10b981" : "#f43f5e";
  const bgFill = isPositive ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)";

  ctx.save();

  // 1. Shaded measurement box
  ctx.fillStyle = bgFill;
  ctx.fillRect(rectX, rectY, rectW, rectH);

  // 2. Dashed outline
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rectX, rectY, rectW, rectH);

  // 3. Diagonal connecting line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 4. Center badge with metrics
  ctx.setLineDash([]);
  const sign = isPositive ? "+" : "";
  const priceText = `${sign}$${formatPrice(priceDiff)} (${sign}${pricePct.toFixed(2)}%)`;
  const barsText = `${barsCount} bar${barsCount !== 1 ? "s" : ""}`;
  const fullText = `${priceText}  •  ${barsText}`;

  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const textWidth = measureTextWidth(ctx, fullText);
  const badgeW = textWidth + 16;
  const badgeH = 22;

  // Position badge near the current cursor or center of measurement
  let badgeX = x2 - badgeW / 2;
  let badgeY = y2 - badgeH - 12;

  if (badgeX < padding.left + 4) badgeX = padding.left + 4;
  if (badgeX + badgeW > rightAxisX - 4) badgeX = rightAxisX - badgeW - 4;
  if (badgeY < padding.top + 4) badgeY = y2 + 12;

  // Badge background (dark glass)
  ctx.fillStyle = "rgba(2, 6, 22, 0.92)";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  // Badge text
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fullText, badgeX + badgeW / 2, badgeY + badgeH / 2);

  ctx.restore();
}
