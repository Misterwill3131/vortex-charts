import type { Candle } from "../types";
import type { ChartBounds, TimeScaleMapping } from "./coordinates";
import { indexToX, priceToY, timeToX } from "./coordinates";

export interface CandleStyle {
  upColor: string;
  downColor: string;
}

const DEFAULT_CANDLE_STYLE: CandleStyle = {
  upColor: "#10b981", // Bullish Emerald
  downColor: "#f43f5e", // Bearish Rose
};

export function drawCandlesticks(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  bounds: ChartBounds,
  style: CandleStyle = DEFAULT_CANDLE_STYLE,
  timeScale?: TimeScaleMapping | null,
  slotOffset: number = 0,
  slotCount?: number
) {
  if (candles.length === 0) return;

  const count = slotCount ?? candles.length;
  const xOf = (idx: number): number => {
    if (idx < 0 || idx >= candles.length) return bounds.padding.left;
    return timeScale
      ? timeToX(candles[idx].t, timeScale, bounds)
      : indexToX(slotOffset + idx, count, bounds);
  };

  // In time mode the body width derives from the smallest mapped gap between
  // consecutive candles, so dense sessions keep readable bodies while gaps
  // (weekends, market pauses) render as proportional empty space.
  let slotWidth = bounds.plotWidth / Math.max(1, count);
  if (timeScale) {
    let minGap = Infinity;
    for (let i = 1; i < candles.length; i++) {
      const gap = xOf(i) - xOf(i - 1);
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    if (isFinite(minGap)) slotWidth = Math.min(slotWidth, minGap);
  }
  const candleBodyWidth = Math.max(2, Math.min(22, Math.floor(slotWidth * 0.72)));

  ctx.save();

  candles.forEach((c, idx) => {
    const x = Math.round(xOf(idx));
    // Skip rendering bars completely outside visible canvas boundaries
    if (x < bounds.padding.left - 25 || x > bounds.chartWidth - bounds.padding.right + 25) {
      return;
    }
    const isUp = c.close >= c.open;
    const color = isUp ? style.upColor : style.downColor;

    const yHigh = Math.round(priceToY(c.high, bounds));
    const yLow = Math.round(priceToY(c.low, bounds));
    const yOpen = Math.round(priceToY(c.open, bounds));
    const yClose = Math.round(priceToY(c.close, bounds));

    const yBodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

    // 1. Draw Wick (High to Low)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, yHigh);
    ctx.lineTo(x + 0.5, yLow);
    ctx.stroke();

    // 2. Draw Body (Open to Close)
    ctx.fillStyle = color;
    const xBodyLeft = Math.round(x - candleBodyWidth / 2);
    ctx.fillRect(xBodyLeft, yBodyTop, candleBodyWidth, bodyHeight);
  });

  ctx.restore();
}