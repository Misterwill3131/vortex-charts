import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "../types";
import type { ChartBounds, TimeScaleMapping } from "../engine/coordinates";
import { indexToX, nearestTimeIndex, timeToX, xToIndex, xToTime, yToPrice } from "../engine/coordinates";
import { panViewport, zoomViewport, type ViewportState } from "../engine/viewport";
import type { RulerPoint, RulerState } from "../engine/ruler";
import type { HoverState } from "../engine/interaction";

const INACTIVE_RULER: RulerState = { active: false, startPoint: null, currentPoint: null };

export type ChartHoverZone = "plot" | "yAxis" | "xAxis";

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
  /** Slot offset when visible slice is shifted by overscroll */
  slotOffset?: number;
  /**
   * Time-based X mapping. When provided (and the visible slice is non-empty),
   * hit-testing resolves the hovered candle by timestamp instead of slot index.
   */
  timeScale?: TimeScaleMapping | null;
  /** Enable wheel zoom + drag pan (candle & range charts) */
  panZoom?: boolean;
  /** Allow direct manipulation dragging past dataset boundaries */
  allowOverscroll?: boolean;
  /** Current viewport state — required when panZoom is enabled */
  viewport?: ViewportState;
  /** Viewport setter — required when panZoom is enabled */
  onViewportChange?: (viewport: ViewportState) => void;
  /** Current vertical price scale factor (from useChartViewport) */
  priceScaleRatio?: number;
  /** Setter for vertical price scale factor */
  onPriceScaleRatioChange?: (ratio: number) => void;
  /** Reset callback for vertical price scale */
  onResetPriceScale?: () => void;
  /** Reset callback for horizontal zoom */
  onReset?: () => void;
}

type DragMode = "none" | "pan" | "scaleY" | "scaleX";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  initialViewport: ViewportState;
  initialPriceScaleRatio: number;
}

/**
 * Centralizes pointer-driven interaction:
 * - Hover crosshair state with magnetized candle snap
 * - Ruler measurement (Shift+drag or toolbar)
 * - Independent X-axis (Time) scaling via left-click drag & mouse wheel
 * - Independent Y-axis (Price) scaling via left-click drag & mouse wheel
 * - Viewport pan and zoom in the plot area
 * - Double-click auto-fit reset (targeted per axis or global)
 */
export function useChartPointer({
  canvasRef,
  bounds,
  visible,
  slotCount,
  slotOffset = 0,
  indexOffset = 0,
  timeScale = null,
  panZoom = false,
  allowOverscroll = true,
  viewport,
  onViewportChange,
  priceScaleRatio: externalPriceRatio,
  onPriceScaleRatioChange,
  onResetPriceScale,
  onReset,
}: UseChartPointerOptions) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [hoverZone, setHoverZone] = useState<ChartHoverZone>("plot");
  const [internalRatio, setInternalRatio] = useState<number>(1.0);
  const [ruler, setRuler] = useState<RulerState>(INACTIVE_RULER);
  const [isRulerToolActive, setIsRulerToolActive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const priceScaleRatio = externalPriceRatio ?? internalRatio;
  const updatePriceRatio = useCallback(
    (next: number) => {
      if (onPriceScaleRatioChange) {
        onPriceScaleRatioChange(next);
      } else {
        setInternalRatio(next);
      }
    },
    [onPriceScaleRatioChange]
  );

  const rafRef = useRef<number>(0);
  const priceScaleRatioRef = useRef<number>(1.0);
  priceScaleRatioRef.current = priceScaleRatio;

  function createInitialViewport(): ViewportState {
    return viewport ?? { startIndex: 0, endIndex: 0, totalCount: 0, minVisible: 1 };
  }

  const dragRef = useRef<DragState>({
    mode: "none",
    startX: 0,
    startY: 0,
    initialViewport: createInitialViewport(),
    initialPriceScaleRatio: 1.0,
  });

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

  // Helper to determine the hover zone
  const getZone = useCallback((x: number, y: number, b: ChartBounds): ChartHoverZone => {
    const rightAxisX = b.chartWidth - b.padding.right;
    const bottomAxisY = b.chartHeight - b.padding.bottom;
    if (x >= rightAxisX) return "yAxis";
    if (y >= bottomAxisY) return "xAxis";
    return "plot";
  }, []);

  // ── Wheel zoom (contextual: Y-axis, X-axis, or plot area) ──
  const boundsRef = useRef(bounds);
  useEffect(() => {
    boundsRef.current = bounds;
  });

  const viewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    viewportChangeRef.current = onViewportChange;
  });

  const liveViewportRef = useRef(viewport);
  useEffect(() => {
    liveViewportRef.current = viewport;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panZoom) return;

    let wheelRaf = 0;
    let pending: { mode: "plot" | "yAxis" | "xAxis"; factor: number; anchorRatio: number } | null = null;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zone = getZone(mouseX, mouseY, b);

      if (zone === "yAxis") {
        // Wheel over price axis: zoom/scale vertical price axis
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        const nextRatio = Math.max(0.1, Math.min(20, priceScaleRatioRef.current * factor));
        updatePriceRatio(nextRatio);
        return;
      }

      if (zone === "xAxis") {
        // Wheel over time axis: zoom/scale horizontal time axis
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        pending = { mode: "xAxis", factor, anchorRatio: 0.5 };
      } else {
        // Default: wheel over plot area (zoom anchored around cursor)
        const anchorRatio = Math.max(0, Math.min(1, (mouseX - b.padding.left) / b.plotWidth));
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        pending = { mode: "plot", factor, anchorRatio };
      }

      if (wheelRaf) return;
      wheelRaf = requestAnimationFrame(() => {
        wheelRaf = 0;
        const p = pending;
        pending = null;
        if (!p) return;
        const next = zoomViewport(liveViewportRef.current ?? createInitialViewport(), p.factor, p.anchorRatio);
        liveViewportRef.current = next;
        viewportChangeRef.current?.(next);
      });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(wheelRaf);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [canvasRef, panZoom, getZone, updatePriceRatio]);

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
    const candleIdx = slotOffset != null && !timeScale ? localIdx - slotOffset : localIdx;
    const candle = (candleIdx >= 0 && candleIdx < visible.length) ? visible[candleIdx] : null;
    const snapX = Math.round(
      timeScale && candle
        ? timeToX(candle.t, timeScale, bounds)
        : indexToX(localIdx, count, bounds)
    );
    const price = yToPrice(mouseY, bounds);
    const globalIndex = timeScale && candle
      ? indexOffset + (candleIdx >= 0 ? candleIdx : 0)
      : indexOffset + localIdx;
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
    const zone = getZone(mouseX, mouseY, bounds);

    // 1. Y-Axis Drag (Price Scale Stretch/Compress)
    if (zone === "yAxis" && panZoom) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "scaleY",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport ?? createInitialViewport(),
        initialPriceScaleRatio: priceScaleRatioRef.current,
      };
      setHover(null);
      return;
    }

    // 2. X-Axis Drag (Time Scale Stretch/Compress)
    if (zone === "xAxis" && panZoom && viewport) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "scaleX",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport,
        initialPriceScaleRatio: priceScaleRatioRef.current,
      };
      setHover(null);
      return;
    }

    // 3. Ruler Measurement (Shift-click or tool)
    const { candle, price, globalIndex } = hitTest(mouseX, mouseY);
    if (e.shiftKey || isRulerToolActive) {
      const point: RulerPoint = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      setRuler({ active: true, startPoint: point, currentPoint: point });
      return;
    }

    // 4. Standard Pan Drag (Direct manipulation via Left Click)
    if (panZoom && viewport && onViewportChange) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "pan",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport,
        initialPriceScaleRatio: priceScaleRatioRef.current,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (visible.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zone = getZone(mouseX, mouseY, bounds);
    setHoverZone(zone);

    // Active Y-Axis Price Scale Drag
    if (dragRef.current.mode === "scaleY") {
      const deltaY = dragRef.current.startY - mouseY; // Drag up = positive (stretch)
      const factor = Math.exp(deltaY * 0.008);
      const nextRatio = Math.max(0.1, Math.min(20, dragRef.current.initialPriceScaleRatio * factor));
      schedule(() => updatePriceRatio(nextRatio));
      return;
    }

    // Active X-Axis Time Scale Drag
    if (dragRef.current.mode === "scaleX" && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX; // Drag right = positive (stretch/zoom in)
      const factor = Math.exp(deltaX * 0.006);
      const nextViewport = zoomViewport(dragRef.current.initialViewport, factor, 0.5);
      schedule(() => onViewportChange(nextViewport));
      return;
    }

    const { candle, snapX, price, globalIndex } = hitTest(mouseX, mouseY);

    // Active ruler measurement drag
    if (ruler.active && ruler.startPoint) {
      const point: RulerPoint = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      schedule(() => setRuler((prev) => ({ ...prev, currentPoint: point })));
      return;
    }

    // Active pan drag (Smooth 60 FPS viewport movement)
    if (dragRef.current.mode === "pan" && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX;
      const barWidth = bounds.plotWidth / Math.max(1, slotCount ?? visible.length);
      const deltaBars = Math.round(deltaX / barWidth);
      const nextViewport = panViewport(dragRef.current.initialViewport, deltaBars, allowOverscroll);
      schedule(() => {
        onViewportChange(nextViewport);
        setHover(null);
      });
      return;
    }

    // Default hover: only active inside plot area
    if (zone === "plot") {
      schedule(() => setHover({ mouseX, mouseY, snapX, index: globalIndex, candle }));
    } else {
      schedule(() => setHover(null));
    }
  };

  const handlePointerUp = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
    setHover(null);
  };

  const handlePointerLeave = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
    setHover(null);
    setHoverZone("plot");
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zone = getZone(mouseX, mouseY, bounds);

    if (zone === "yAxis") {
      // Reset vertical price scale auto-fit only
      if (onResetPriceScale) {
        onResetPriceScale();
      } else {
        updatePriceRatio(1.0);
      }
      return;
    }

    if (zone === "xAxis") {
      // Reset horizontal time scale only
      onReset?.();
      return;
    }

    // Reset both in plot area
    if (onResetPriceScale) {
      onResetPriceScale();
    } else {
      updatePriceRatio(1.0);
    }
    onReset?.();
    clearRuler();
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

  const resetPriceScale = useCallback(() => {
    if (onResetPriceScale) {
      onResetPriceScale();
    } else {
      updatePriceRatio(1.0);
    }
  }, [onResetPriceScale, updatePriceRatio]);

  // Compute cursor style based on hover zone and drag activity
  const cursorStyle =
    dragRef.current.mode === "scaleY" || hoverZone === "yAxis"
      ? "cursor-ns-resize"
      : dragRef.current.mode === "scaleX" || hoverZone === "xAxis"
      ? "cursor-ew-resize"
      : ruler.active || isRulerToolActive
      ? "cursor-crosshair"
      : isDragging || dragRef.current.mode === "pan"
      ? "cursor-grabbing"
      : panZoom && hoverZone === "plot"
      ? "cursor-grab"
      : "cursor-crosshair";

  return {
    hover,
    hoverZone,
    priceScaleRatio,
    resetPriceScale,
    cursorStyle,
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
      onDoubleClick: handleDoubleClick,
    },
  };
}
