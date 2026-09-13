import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export interface RenkoBrick {
  open: number;
  close: number;
  high: number;
  low: number;
  isUp: boolean;
  t: number;
}

export interface DrawRenkoOptions {
  upColor?: string;
  downColor?: string;
  borderColor?: string;
}

/**
 * Transforms candles into time-independent Renko bricks.
 * Each brick represents an exact price movement delta.
 */
export function computeRenkoBricks(
  candles: Candle[],
  brickSize: number = 1.0
): RenkoBrick[] {
  if (!candles || candles.length === 0 || brickSize <= 0) return [];

  const bricks: RenkoBrick[] = [];
  let currentPrice = candles[0].close;

  // Initial reference brick
  let lastBrickTop = currentPrice;
  let lastBrickBottom = currentPrice - brickSize;
  let lastDirectionUp = true;

  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;
    const time = candles[i].t;

    // Uptrend continuation
    while (price >= lastBrickTop + brickSize) {
      const open = lastBrickTop;
      const close = lastBrickTop + brickSize;
      bricks.push({
        open,
        close,
        high: close,
        low: open,
        isUp: true,
        t: time,
      });
      lastBrickBottom = open;
      lastBrickTop = close;
      lastDirectionUp = true;
    }

    // Downtrend continuation or reversal
    const reversalThreshold = lastDirectionUp
      ? lastBrickBottom - brickSize
      : lastBrickBottom - brickSize;

    while (price <= lastBrickBottom - brickSize) {
      const open = lastBrickBottom;
      const close = lastBrickBottom - brickSize;
      bricks.push({
        open,
        close,
        high: open,
        low: close,
        isUp: false,
        t: time,
      });
      lastBrickTop = open;
      lastBrickBottom = close;
      lastDirectionUp = false;
    }
  }

  return bricks;
}

/**
 * Pure Canvas 2D renderer for Renko bricks.
 */
export function drawRenkoBricks(
  ctx: CanvasRenderingContext2D,
  bricks: RenkoBrick[],
  bounds: ChartBounds,
  options: DrawRenkoOptions = {}
): void {
  if (!bricks || bricks.length === 0) return;

  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    borderColor = "rgba(255, 255, 255, 0.15)",
  } = options;

  const count = bricks.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const brickWidth = Math.max(2, Math.min(30, slotWidth * 0.85));

  ctx.save();

  for (let i = 0; i < count; i++) {
    const b = bricks[i];
    const x = Math.round(indexToX(i, count, bounds) - brickWidth / 2);
    const yTop = Math.round(priceToY(Math.max(b.open, b.close), bounds));
    const yBottom = Math.round(priceToY(Math.min(b.open, b.close), bounds));
    const height = Math.max(2, yBottom - yTop);

    ctx.fillStyle = b.isUp ? upColor : downColor;
    ctx.fillRect(x, yTop, brickWidth, height);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, yTop, brickWidth, height);
  }

  ctx.restore();
}
