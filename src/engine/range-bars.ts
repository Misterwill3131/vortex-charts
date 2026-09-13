import type { Candle } from "../types";

export interface TickData {
  price: number;
  volume?: number;
  t?: number;
}

/**
 * Computes constant-range bars from price ticks or high/low points.
 * A new candle is sealed when (high - low) reaches rangeSize.
 */
export function computeRangeBars(
  ticks: (TickData | Candle)[],
  rangeSize: number = 0.5
): Candle[] {
  if (!ticks || ticks.length === 0 || rangeSize <= 0) return [];

  const rawPrices: { price: number; volume: number; t: number }[] = [];

  for (const item of ticks) {
    if ("price" in item && typeof item.price === "number") {
      rawPrices.push({
        price: item.price,
        volume: item.volume ?? 1,
        t: item.t ?? Date.now(),
      });
    } else if ("close" in item) {
      const c = item as Candle;
      // Synthesize tick trajectory through open -> low -> high -> close
      rawPrices.push({ price: c.open, volume: (c.volume ?? 4) * 0.25, t: c.t });
      if (c.close >= c.open) {
        rawPrices.push({ price: c.low, volume: (c.volume ?? 4) * 0.25, t: c.t });
        rawPrices.push({ price: c.high, volume: (c.volume ?? 4) * 0.25, t: c.t });
      } else {
        rawPrices.push({ price: c.high, volume: (c.volume ?? 4) * 0.25, t: c.t });
        rawPrices.push({ price: c.low, volume: (c.volume ?? 4) * 0.25, t: c.t });
      }
      rawPrices.push({ price: c.close, volume: (c.volume ?? 4) * 0.25, t: c.t });
    }
  }

  if (rawPrices.length === 0) return [];

  const bars: Candle[] = [];
  let currentOpen = rawPrices[0].price;
  let currentHigh = currentOpen;
  let currentLow = currentOpen;
  let currentVolume = 0;
  let currentT = rawPrices[0].t;

  for (const p of rawPrices) {
    currentVolume += p.volume;
    currentT = p.t;

    if (p.price > currentHigh) currentHigh = p.price;
    if (p.price < currentLow) currentLow = p.price;

    // Check if range target exceeded
    if (currentHigh - currentLow >= rangeSize) {
      const close = p.price;
      bars.push({
        t: currentT,
        open: currentOpen,
        high: currentHigh,
        low: currentLow,
        close,
        volume: currentVolume,
      });

      // Next bar opens at current close
      currentOpen = close;
      currentHigh = close;
      currentLow = close;
      currentVolume = 0;
    }
  }

  // Final unclosed in-progress bar
  if (currentVolume > 0 || bars.length === 0) {
    bars.push({
      t: currentT,
      open: currentOpen,
      high: currentHigh,
      low: currentLow,
      close: rawPrices[rawPrices.length - 1].price,
      volume: currentVolume,
    });
  }

  return bars;
}
