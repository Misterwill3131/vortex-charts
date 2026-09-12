/**
 * Viewport state and calculations for horizontal time-series zooming & panning.
 */

export interface ViewportState {
  /** Index of the first visible candle in the series (inclusive, 0-based) */
  startIndex: number;
  /** Index of the last visible candle in the series (inclusive, 0-based) */
  endIndex: number;
  /** Total count of items in the series */
  totalCount: number;
  /** Minimum number of candles visible when fully zoomed in */
  minVisible: number;
}

/**
 * Initializes a full-span viewport encompassing all available candles.
 */
export function createViewport(totalCount: number, minVisible: number = 8): ViewportState {
  const safeCount = Math.max(0, totalCount);
  return {
    startIndex: 0,
    endIndex: Math.max(0, safeCount - 1),
    totalCount: safeCount,
    minVisible: Math.min(minVisible, Math.max(1, safeCount)),
  };
}

/**
 * Returns true if the viewport is zoomed in (not displaying the entire series).
 */
export function isViewportZoomed(viewport: ViewportState): boolean {
  if (viewport.totalCount <= 0) return false;
  return viewport.startIndex > 0 || viewport.endIndex < viewport.totalCount - 1;
}

/**
 * Returns the current zoom multiplier (e.g. 1.0x, 2.5x).
 */
export function getZoomLevel(viewport: ViewportState): number {
  const visibleCount = getVisibleCount(viewport);
  if (visibleCount <= 0 || viewport.totalCount <= 0) return 1;
  const ratio = viewport.totalCount / visibleCount;
  return Math.round(ratio * 10) / 10;
}

/**
 * Returns the number of currently visible candles in the viewport.
 */
export function getVisibleCount(viewport: ViewportState): number {
  if (viewport.totalCount <= 0) return 0;
  return Math.max(1, viewport.endIndex - viewport.startIndex + 1);
}

/**
 * Zooms the viewport in or out around an anchor point.
 * @param viewport Current viewport state
 * @param factor > 1 to zoom IN (fewer candles), < 1 to zoom OUT (more candles)
 * @param anchorRatio 0.0 = left edge, 0.5 = center, 1.0 = right edge (cursor X position)
 */
export function zoomViewport(
  viewport: ViewportState,
  factor: number,
  anchorRatio: number = 0.5
): ViewportState {
  const { totalCount, minVisible, startIndex, endIndex } = viewport;
  if (totalCount <= minVisible) return viewport;

  const currentSpan = endIndex - startIndex + 1;
  // Factor > 1 -> newSpan is smaller (zoom in). Factor < 1 -> newSpan is larger (zoom out).
  const targetSpan = Math.round(currentSpan / factor);
  const newSpan = Math.max(minVisible, Math.min(totalCount, targetSpan));

  if (newSpan === currentSpan) return viewport;

  // Preserve anchor point position
  const spanDelta = newSpan - currentSpan;
  const clampedAnchor = Math.max(0, Math.min(1, anchorRatio));
  let newStart = Math.round(startIndex - spanDelta * clampedAnchor);
  let newEnd = newStart + newSpan - 1;

  // Clamp within bounds [0, totalCount - 1]
  if (newStart < 0) {
    newEnd += -newStart;
    newStart = 0;
  }
  if (newEnd >= totalCount) {
    const overflow = newEnd - (totalCount - 1);
    newStart = Math.max(0, newStart - overflow);
    newEnd = totalCount - 1;
  }

  return {
    ...viewport,
    startIndex: Math.max(0, newStart),
    endIndex: Math.min(totalCount - 1, newEnd),
  };
}

/**
 * Pans the viewport horizontally by a specific number of bars.
 * @param viewport Current viewport state
 * @param deltaBars Positive = scroll earlier in history (left), Negative = scroll later (right)
 */
export function panViewport(viewport: ViewportState, deltaBars: number): ViewportState {
  const { totalCount, startIndex, endIndex } = viewport;
  if (totalCount <= 0 || deltaBars === 0) return viewport;

  const span = endIndex - startIndex + 1;
  let newStart = startIndex - deltaBars;
  let newEnd = newStart + span - 1;

  if (newStart < 0) {
    newStart = 0;
    newEnd = Math.min(totalCount - 1, span - 1);
  } else if (newEnd >= totalCount) {
    newEnd = totalCount - 1;
    newStart = Math.max(0, totalCount - span);
  }

  return {
    ...viewport,
    startIndex: newStart,
    endIndex: newEnd,
  };
}

/**
 * Resets the viewport to show all candles.
 */
export function resetViewport(totalCount: number, minVisible: number = 8): ViewportState {
  return createViewport(totalCount, minVisible);
}

/**
 * Creates a viewport showing the LAST `visibleBars` candles (or all of them
 * when the series is shorter). Used for live charts that open on recent data.
 */
export function createTailViewport(
  totalCount: number,
  visibleBars: number,
  minVisible: number = 8
): ViewportState {
  const base = createViewport(totalCount, minVisible);
  if (totalCount <= visibleBars) return base;
  const span = Math.max(1, visibleBars);
  return {
    ...base,
    startIndex: Math.max(0, totalCount - span),
    endIndex: totalCount - 1,
  };
}

/**
 * Resyncs a viewport after the series grew or shrank while KEEPING the user's
 * zoom level (span) and sliding the window to the newest bars. This is the
 * "follow" mode used by live (SSE) charts so appended candles never reset
 * the zoom. Falls back to a full reset when the series empties.
 */
export function followViewport(prev: ViewportState, totalCount: number): ViewportState {
  if (prev.totalCount === totalCount) return prev;
  if (totalCount <= 0) return createViewport(0, prev.minVisible);
  const span = Math.max(1, prev.endIndex - prev.startIndex + 1);
  const endIndex = totalCount - 1;
  const startIndex = Math.max(0, endIndex - span + 1);
  return {
    ...prev,
    startIndex,
    endIndex,
    totalCount,
  };
}
