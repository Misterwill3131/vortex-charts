import { useCallback, useEffect, useState } from "react";
import {
  createViewport,
  getZoomLevel,
  isViewportZoomed,
  panViewport,
  zoomViewport,
  type ViewportState,
} from "../engine/viewport";

/**
 * Encapsulates interactive viewport state (zoom & pan) with automatic
 * resynchronization when the underlying series length changes.
 */
export function useChartViewport(totalCount: number, minVisible: number = 8) {
  const [viewport, setViewport] = useState<ViewportState>(() =>
    createViewport(totalCount, minVisible)
  );

  // Resync when the series grows or shrinks; returns the same reference
  // when the count is unchanged so no re-render is triggered.
  useEffect(() => {
    setViewport((prev) =>
      prev.totalCount === totalCount ? prev : createViewport(totalCount, minVisible)
    );
  }, [totalCount, minVisible]);

  const zoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);

  const resetView = useCallback(() => {
    setViewport(createViewport(totalCount, minVisible));
  }, [totalCount, minVisible]);

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
