import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export interface CandleStyle {
  upColor: string;
  downColor: string;
}

export const DEFAULT_CANDLE_STYLE: CandleStyle = {
  upColor: "#10b981", // Bullish Emerald
  downColor: "#f43f5e", // Bearish Rose
};

export function drawCandlesticks(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  bounds: ChartBounds,
  style: CandleStyle = DEFAULT_CANDLE_STYLE
) {
  if (candles.length === 0) return;

  const count = candles.length;
  const candleSlotWidth = bounds.plotWidth / count;
  const candleBodyWidth = Math.max(2, Math.min(22, Math.floor(candleSlotWidth * 0.72)));

  ctx.save();

  candles.forEach((c, idx) => {
    const x = Math.round(indexToX(idx, count, bounds));
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
