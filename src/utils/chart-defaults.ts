export type LineStyleType = "solid" | "dotted" | "dashed";

/**
 * Formats a candle timestamp. Intraday candles show local HH:mm, daily
 * candles show the LOCAL calendar date (toLocaleDateString) — the previous
 * toISOString implementation shifted dates by one day for non-UTC timezones.
 */
export function formatCandleTime(timestampMs: number, isIntraday: boolean = false): string {
  const d = new Date(timestampMs);
  if (isIntraday) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Adaptive price formatting:
 * - >= 10 000  : grouped thousands, 2 decimals (indices, BTC)
 * - >= 0.01    : fixed 2 decimals (equities)
 * - < 0.01     : 4 significant digits (sub-cent crypto assets)
 */
export function formatPrice(price: number): string {
  if (isNaN(price) || !isFinite(price)) return "—";
  const abs = Math.abs(price);
  if (abs >= 10_000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (abs >= 0.01) return price.toFixed(2);
  if (abs === 0) return "0.00";
  return price.toPrecision(4);
}
