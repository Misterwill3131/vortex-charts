import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "../types";
import type { ChartBounds, TimeScaleMapping } from "../engine/coordinates";
import { indexToX, nearestTimeIndex, timeToX, xToIndex, xToTime, yToPrice } from "../engine/coordinates";
import { panViewport, zoomViewport, type ViewportState } from "../engine/viewport";
import type { RulerPoint, RulerState } from "../engine/ruler";
import type { HoverState } from "../engine/interaction";

const INACTIVE_RULER: RulerState = { active: false, startPoint: null, currentPoint: null };

export interface UseChartPointerOptions {
  /** Main canvas (receives the pointer events) */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Current chart bounds (kept fresh through closures, refs for native listeners) */
  bounds: ChartBounds;
  /** Visible candle slice used for hit-testing */
  visible: Candle[];
  /**
   * Total number of X slots for hit-testing. Defaults to `visible.length`.
   * The cone chart passes history + future projection slots.
   */
  slotCount?: number;
  /** Global index of the first visible candle (viewport pan offset) */
  indexOffset?: number;
  /**
   * Time-based X mapping. When provided (and the visible slice is non-empty),
   * hit-testing resolves the hovered candle by timestamp instead of slot index.
   */
  timeScale?: TimeScaleMapping | null;
  /** Enable wheel zoom + drag pan (candle & range charts) */
  panZoom?: boolean;
  /** Current viewport state — required when panZoom is enabled */
  viewport?: ViewportState;
  /** Viewport setter — required when panZoom is enabled */
  onViewportChange?: (viewport: ViewportState) => void;
}

/**
 * Centralizes pointer-driven interaction: hover crosshair state, ruler
 * measurement, drag panning and wheel zooming.
 *
 * - Uses Pointer Events (mouse, touch and pen in a single API).
 * - Coalesces hover / ruler / pan updates through requestAnimationFrame so
 *   at most one state update per display frame reaches React.
 * - Snaps hover to candle centers (magnetized crosshair).
 */
export function useChartPointer({
  canvasRef,
  bounds,
  visible,
  slotCount,
  indexOffset = 0,
  timeScale = null,
  panZoom = false,
  viewport,
  onViewportChange,
}: UseChartPointerOptions) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [ruler, setRuler] = useState<RulerState>(INACTIVE_RULER);
  const [isRulerToolActive, setIsRulerToolActive] = useState<boolean>(false);

  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ isDragging: boolean; startX: number; initialViewport: ViewportState }>({
    isDragging: false,
    startX: 0,
    initialViewport: createInitialViewport(),
  });

  function createInitialViewport(): ViewportState {
    return viewport ?? { startIndex: 0, endIndex: 0, totalCount: 0, minVisible: 1 };
  }

  const schedule = useCallback((fn: () => void) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(fn);
  }, []);

  // Drop stale hover state whenever the underlying visible data changes
  useEffect(() => {
    setHover(null);
  }, [visible]);

  // Escape clears any active measurement
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRuler(INACTIVE_RULER);
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cancel any pending frame on unmount (no leaked rAF callbacks)
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ── Wheel zoom (native listener, non-passive to prevent page scroll) ──
  const boundsRef = useRef(bounds);
  useEffect(() => {
    boundsRef.current = bounds;
  });

  const viewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    viewportChangeRef.current = onViewportChange;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panZoom) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const anchorRatio = (mouseX - b.padding.left) / b.plotWidth;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      viewportChangeRef.current?.(zoomViewportByAnchor(factor, anchorRatio));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef, panZoom]);

  // zoomViewport needs the current viewport; go through a ref to avoid re-attaching the listener
  const liveViewportRef = useRef(viewport);
  useEffect(() => {
    liveViewportRef.current = viewport;
  });

  function zoomViewportByAnchor(factor: number, anchorRatio: number): ViewportState {
    return zoomViewport(liveViewportRef.current ?? createInitialViewport(), factor, anchorRatio);
  }

  // ── Hit testing (magnetized on candle centers) ──
  const hitTest = (mouseX: number, mouseY: number) => {
    const count = slotCount ?? visible.length;
    let localIdx: number;
    if (timeScale && visible.length > 0) {
      localIdx = nearestTimeIndex(visible, xToTime(mouseX, timeScale, bounds));
    } else {
      localIdx = xToIndex(mouseX, count, bounds);
    }
    if (localIdx < 0) {
      const centerX = bounds.padding.left + bounds.plotWidth / 2;
      return { candle: null, snapX: centerX, price: yToPrice(mouseY, bounds), globalIndex: -1 };
    }
    const candle = visible[localIdx] ?? null;
    const snapX = Math.round(
      timeScale && candle
        ? timeToX(candle.t, timeScale, bounds)
        : indexToX(localIdx, count, bounds)
    );
    const price = yToPrice(mouseY, bounds);
    const globalIndex = indexOffset + localIdx;
    return { candle, snapX, price, globalIndex };
  };

  // ── Pointer handlers (mouse + touch + pen) ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (visible.length === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return; // left click only

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { candle, price, globalIndex } = hitTest(mouseX, mouseY);

    if (e.shiftKey || isRulerToolActive) {
      const point: RulerPoint = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      setRuler({ active: true, startPoint: point, currentPoint: point });
      return;
    }

    if (panZoom && viewport && onViewportChange) {
      // Capture the pointer so the drag keeps tracking outside the canvas bounds
      canvas.setPointerCapture?.(e.pointerId);
      dragRef.current = { isDragging: true, startX: mouseX, initialViewport: viewport };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (visible.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { candle, snapX, price, globalIndex } = hitTest(mouseX, mouseY);

    // Active ruler measurement drag
    if (ruler.active && ruler.startPoint) {
      const point: RulerPoint = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      schedule(() => setRuler((prev) => ({ ...prev, currentPoint: point })));
      return;
    }

    // Active pan drag
    if (dragRef.current.isDragging && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX;
      const barWidth = bounds.plotWidth / Math.max(1, slotCount ?? visible.length);
      const deltaBars = Math.round(deltaX / barWidth);
      const nextViewport = panViewport(dragRef.current.initialViewport, deltaBars);
      schedule(() => {
        onViewportChange(nextViewport);
        setHover(null);
      });
      return;
    }

    // Default: hover crosshair (rAF-coalesced)
    schedule(() => setHover({ mouseX, mouseY, snapX, index: globalIndex, candle }));
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
  };

  const handlePointerCancel = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };

  const handlePointerLeave = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };

  const toggleRuler = useCallback(() => {
    setIsRulerToolActive((prev) => {
      if (prev) setRuler(INACTIVE_RULER);
      return !prev;
    });
  }, []);

  const clearRuler = useCallback(() => {
    setRuler(INACTIVE_RULER);
    setIsRulerToolActive(false);
  }, []);

  return {
    hover,
    ruler,
    isRulerToolActive,
    toggleRuler,
    clearRuler,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave,
    },
  };
}
