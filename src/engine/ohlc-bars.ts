import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export interface DrawOhlcOptions {
  upColor?: string;
  downColor?: string;
  lineWidth?: number;
  tickWidth?: number;
}

/**
 * Pure Canvas 2D renderer for western OHLC Bar Charts.
 * Vertical bar from Low to High, left tick for Open, right tick for Close.
 */
export function drawOhlcBars(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  bounds: ChartBounds,
  options: DrawOhlcOptions = {}
): void {
  if (!candles || candles.length === 0) return;

  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    lineWidth = 1.5,
    tickWidth,
  } = options;

  const count = candles.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const halfTick = tickWidth ? tickWidth / 2 : Math.max(2, Math.min(8, slotWidth * 0.35));

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (let i = 0; i < count; i++) {
    const c = candles[i];
    const x = Math.round(indexToX(i, count, bounds));
    const yHigh = Math.round(priceToY(c.high, bounds));
    const yLow = Math.round(priceToY(c.low, bounds));
    const yOpen = Math.round(priceToY(c.open, bounds));
    const yClose = Math.round(priceToY(c.close, bounds));

    const isBullish = c.close >= c.open;
    const color = isBullish ? upColor : downColor;
    ctx.strokeStyle = color;

    // 1. Vertical high-to-low spine
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // 2. Open tick (pointing left)
    ctx.beginPath();
    ctx.moveTo(x, yOpen);
    ctx.lineTo(x - halfTick, yOpen);
    ctx.stroke();

    // 3. Close tick (pointing right)
    ctx.beginPath();
    ctx.moveTo(x, yClose);
    ctx.lineTo(x + halfTick, yClose);
    ctx.stroke();
  }

  ctx.restore();
}
