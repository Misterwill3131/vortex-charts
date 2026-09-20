/**
 * Formats a candle timestamp. Intraday candles show HH:mm, daily candles
 * show the LOCAL calendar date. Pass `timeZone` (e.g. "America/New_York")
 * to pin the labels to a market timezone instead of the browser's.
 */
export function formatCandleTime(
  timestampMs: number,
  isIntraday: boolean = false,
  timeZone?: string
): string {
  const d = new Date(timestampMs);
  const tz = timeZone ? { timeZone } : {};
  if (isIntraday) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...tz,
    });
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...tz,
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
