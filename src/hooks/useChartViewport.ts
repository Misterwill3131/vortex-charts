import { useCallback, useEffect, useState } from "react";
import {
  createTailViewport,
  createViewport,
  followViewport,
  getZoomLevel,
  isViewportZoomed,
  panViewport,
  zoomViewport,
  type ViewportState,
} from "../engine/viewport";

export interface UseChartViewportOptions {
  /**
   * "reset" (default): full view every time the series length changes.
   * "follow": keep the user's zoom span and slide the window to the newest
   * bars — designed for live-updating (SSE/WebSocket) series.
   */
  mode?: "reset" | "follow";
  /** Open the chart on the last N bars instead of the full series */
  initialVisibleBars?: number;
}

/**
 * Encapsulates interactive viewport state (zoom & pan) with automatic
 * resynchronization when the underlying series length changes.
 */
export function useChartViewport(
  totalCount: number,
  minVisible: number = 8,
  options: UseChartViewportOptions = {}
) {
  const { mode = "reset", initialVisibleBars } = options;

  const [viewport, setViewport] = useState<ViewportState>(() =>
    initialVisibleBars
      ? createTailViewport(totalCount, initialVisibleBars, minVisible)
      : createViewport(totalCount, minVisible)
  );

  // Resync when the series grows or shrinks; returns the same reference
  // when the count is unchanged so no re-render is triggered.
  useEffect(() => {
    setViewport((prev) => {
      if (prev.totalCount === totalCount) return prev;
      if (mode === "follow") return followViewport(prev, totalCount);
      return initialVisibleBars
        ? createTailViewport(totalCount, initialVisibleBars, minVisible)
        : createViewport(totalCount, minVisible);
    });
  }, [totalCount, minVisible, mode, initialVisibleBars]);

  const zoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);

  const resetView = useCallback(() => {
    setViewport(
      initialVisibleBars
        ? createTailViewport(totalCount, initialVisibleBars, minVisible)
        : createViewport(totalCount, minVisible)
    );
  }, [totalCount, minVisible, initialVisibleBars]);

  const pan = useCallback((deltaBars: number) => {
    setViewport((prev) => panViewport(prev, deltaBars));
  }, []);

  return {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetView,
    pan,
    isZoomed: isViewportZoomed(viewport),
    zoomLevel: getZoomLevel(viewport),
  };
}