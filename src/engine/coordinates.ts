export interface ViewportPadding {
  top: number;
  bottom: number;
  left: number;
  right: number; // Space reserved for right-side price scale
}

export const DEFAULT_PADDING: ViewportPadding = {
  top: 20,
  bottom: 26,
  left: 12,
  right: 64,
};

export interface ChartBounds {
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  chartWidth: number;
  chartHeight: number;
  plotWidth: number;
  plotHeight: number;
  padding: ViewportPadding;
}

export function computeBounds(
  prices: number[],
  width: number,
  height: number,
  padding: ViewportPadding = DEFAULT_PADDING
): ChartBounds {
  const validPrices = prices.filter(
    (p) => typeof p === "number" && !isNaN(p) && isFinite(p) && p > 0
  );

  // Reduce instead of Math.min(...spread): spread arguments overflow the
  // call stack beyond ~65k items, which crashes on large series.
  let min = Infinity;
  let max = -Infinity;
  for (const p of validPrices) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  if (!isFinite(min) || !isFinite(max)) {
    min = 100;
    max = 105;
  }

  if (min === max) {
    min *= 0.98;
    max *= 1.02;
  }

  // Add 6% vertical padding
  const span = max - min;
  const pad = Math.max(span * 0.08, 0.5);
  const minPrice = min - pad;
  const maxPrice = max + pad;
  const priceRange = maxPrice - minPrice;

  const plotWidth = Math.max(width - padding.left - padding.right, 10);
  const plotHeight = Math.max(height - padding.top - padding.bottom, 10);

  return {
    minPrice,
    maxPrice,
    priceRange,
    chartWidth: width,
    chartHeight: height,
    plotWidth,
    plotHeight,
    padding,
  };
}

export function priceToY(price: number, bounds: ChartBounds): number {
  const { minPrice, priceRange, plotHeight, padding } = bounds;
  if (priceRange <= 0) return padding.top + plotHeight / 2;
  const ratio = (price - minPrice) / priceRange;
  return padding.top + plotHeight * (1 - ratio);
}

export function yToPrice(y: number, bounds: ChartBounds): number {
  const { minPrice, priceRange, plotHeight, padding } = bounds;
  const ratio = 1 - (y - padding.top) / plotHeight;
  return minPrice + ratio * priceRange;
}

export function indexToX(index: number, totalCount: number, bounds: ChartBounds): number {
  const { plotWidth, padding } = bounds;
  if (totalCount <= 1) return padding.left + plotWidth / 2;
  const step = plotWidth / totalCount;
  return padding.left + index * step + step / 2;
}

export function xToIndex(x: number, totalCount: number, bounds: ChartBounds): number {
  const { plotWidth, padding } = bounds;
  if (totalCount <= 0) return -1;
  const step = plotWidth / totalCount;
  const raw = Math.floor((x - padding.left) / step);
  return Math.max(0, Math.min(totalCount - 1, raw));
}

export interface ViewportLike {
  startIndex: number;
  endIndex: number;
  totalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-based X mapping (gap-aware: weekends / market pauses render as
// proportional empty space instead of false equidistant slots)
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeScaleMapping {
  /** Timestamp of the first visible candle */
  tMin: number;
  /** Timestamp of the last visible candle */
  tMax: number;
}

export function timeToX(t: number, scale: TimeScaleMapping, bounds: ChartBounds): number {
  const span = scale.tMax - scale.tMin;
  if (span <= 0) return bounds.padding.left + bounds.plotWidth / 2;
  const ratio = (t - scale.tMin) / span;
  return bounds.padding.left + ratio * bounds.plotWidth;
}

export function xToTime(x: number, scale: TimeScaleMapping, bounds: ChartBounds): number {
  const span = scale.tMax - scale.tMin;
  if (span <= 0) return scale.tMin;
  const ratio = (x - bounds.padding.left) / bounds.plotWidth;
  return scale.tMin + ratio * span;
}

/**
 * Binary search over chronologically sorted items: returns the index whose
 * timestamp is nearest to `target`. Returns -1 for an empty array.
 */
export function nearestTimeIndex(items: { t: number }[], target: number): number {
  if (items.length === 0) return -1;
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].t < target) lo = mid + 1;
    else hi = mid;
  }
  // `lo` is the first item >= target; compare with the previous item
  if (lo > 0 && Math.abs(items[lo - 1].t - target) <= Math.abs(items[lo].t - target)) {
    return lo - 1;
  }
  return lo;
}

/**
 * Maps a global data index to an X coordinate using the active viewport window.
 */
export function viewportIndexToX(
  globalIndex: number,
  viewport: ViewportLike,
  bounds: ChartBounds
): number {
  const visibleCount = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const localIndex = globalIndex - viewport.startIndex;
  return indexToX(localIndex, visibleCount, bounds);
}

/**
 * Maps an X coordinate on the chart to a global data index using the active viewport window.
 */
export function viewportXToIndex(
  x: number,
  viewport: ViewportLike,
  bounds: ChartBounds
): number {
  const visibleCount = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const localIndex = xToIndex(x, visibleCount, bounds);
  if (localIndex < 0) return -1;
  return Math.max(0, Math.min(viewport.totalCount - 1, viewport.startIndex + localIndex));
}
