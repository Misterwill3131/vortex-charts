import type { Candle } from "../types";

/**
 * Transforms standard OHLC candles into Heikin-Ashi smoothed candles.
 * Filters intraday market noise and highlights primary directional momentum.
 */
export function computeHeikinAshi(candles: Candle[]): Candle[] {
  if (!candles || candles.length === 0) return [];

  const result: Candle[] = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    const curr = candles[i];
    const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;

    let haOpen: number;
    if (i === 0) {
      haOpen = (curr.open + curr.close) / 2;
    } else {
      const prev = result[i - 1];
      haOpen = (prev.open + prev.close) / 2;
    }

    const haHigh = Math.max(curr.high, haOpen, haClose);
    const haLow = Math.min(curr.low, haOpen, haClose);

    result[i] = {
      t: curr.t,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: curr.volume,
    };
  }

  return result;
}
