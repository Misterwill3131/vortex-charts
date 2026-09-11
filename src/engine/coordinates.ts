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
  const validPrices = prices.filter((p) => typeof p === "number" && !isNaN(p) && p > 0);
  let min = validPrices.length > 0 ? Math.min(...validPrices) : 100;
  let max = validPrices.length > 0 ? Math.max(...validPrices) : 105;

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
