import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Candle, PriorDayRange, PremarketRange, VwapPoint } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX, xToIndex, yToPrice } from "../engine/coordinates";
import {
  createViewport,
  zoomViewport,
  panViewport,
  resetViewport,
  isViewportZoomed,
  getZoomLevel,
  type ViewportState,
} from "../engine/viewport";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawSessionBox } from "../engine/boxes";
import { drawLineSeries, type DataPoint } from "../engine/lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, formatChange, formatVolume, type HoverState } from "../engine/interaction";
import { drawRulerOverlay, type RulerState } from "../engine/ruler";
import { VortexChartControls } from "./VortexChartControls";
import { setupCanvasDpi } from "../engine/canvas";
import { formatCandleTime, formatPrice } from "../utils/chart-defaults";

export interface VortexRangeChartProps {
  candles: Candle[];
  priorDay?: PriorDayRange | null;
  premarket?: PremarketRange | null;
  vwapSeries?: VwapPoint[];
  overlayMode?: "all" | "boxes" | "vwap" | "none";
  height?: number;
  className?: string;
  showWatermark?: boolean;
  showControls?: boolean;
  theme?: Partial<typeof VORTEX_THEME>;
}

export const VortexRangeChart: React.FC<VortexRangeChartProps> = ({
  candles,
  priorDay,
  premarket,
  vwapSeries = [],
  overlayMode = "all",
  height = 300,
  className = "",
  showWatermark = true,
  showControls = true,
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Deduplicate and sort intraday candles
  const sortedCandles = useMemo(() => {
    return Array.from(
      new Map(candles.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles]);

  // Interactive Viewport State (Zoom & Pan)
  const [viewport, setViewport] = useState<ViewportState>(() =>
    createViewport(sortedCandles.length, 12)
  );

  useEffect(() => {
    setViewport((prev) => {
      if (prev.totalCount === sortedCandles.length) return prev;
      return createViewport(sortedCandles.length, 12);
    });
  }, [sortedCandles.length]);

  // Ruler state
  const [isRulerToolActive, setIsRulerToolActive] = useState<boolean>(false);
  const [ruler, setRuler] = useState<RulerState>({
    active: false,
    startPoint: null,
    currentPoint: null,
  });

  // Pan dragging ref
  const dragRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    startX: number;
    initialViewport: ViewportState;
  }>({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    initialViewport: createViewport(0),
  });

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

  // Slice visible candles according to viewport
  const visibleCandles = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);

  // Handle ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || 600);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute adaptive price bounds (Auto-scale vertical price axis)
  const bounds = useMemo(() => {
    const prices: number[] = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));

    if (priorDay && priorDay.high > 0) prices.push(priorDay.high, priorDay.low);
    if (premarket && premarket.high > 0) prices.push(premarket.high, premarket.low);
    vwapSeries.forEach((v) => {
      if (typeof v.vwap === "number" && v.vwap > 0) prices.push(v.vwap);
    });

    return computeBounds(prices, containerWidth, height);
  }, [visibleCandles, priorDay, premarket, vwapSeries, containerWidth, height]);

  // Generate bottom time labels for visible slice
  const timeLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));

    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(i, count, bounds);
      const text = formatCandleTime(c.t, true);
      labels.push({ x, text });
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds]);

  // Map VWAP series to X coordinates matching visible candles
  const vwapPoints = useMemo<DataPoint[]>(() => {
    if (vwapSeries.length === 0 || visibleCandles.length === 0) return [];

    const points: DataPoint[] = [];
    const count = visibleCandles.length;

    vwapSeries.forEach((v) => {
      // Find closest candle index in visible set
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < count; i++) {
        const diff = Math.abs(visibleCandles[i].t - v.t);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      if (closestIdx >= 0 && minDiff < 1000 * 60 * 30) {
        const x = indexToX(closestIdx, count, bounds);
        points.push({ x, price: v.vwap });
      }
    });

    return points;
  }, [vwapSeries, visibleCandles, bounds]);

  // Interactive Viewport Controls
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setViewport(resetViewport(sortedCandles.length, 12));
    setRuler({ active: false, startPoint: null, currentPoint: null });
  }, [sortedCandles.length]);

  const toggleRuler = useCallback(() => {
    setIsRulerToolActive((prev) => {
      if (prev) {
        setRuler({ active: false, startPoint: null, currentPoint: null });
      }
      return !prev;
    });
  }, []);

  // Native non-passive Wheel listener for seamless trackpad / mouse-wheel zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const anchorRatio = (mouseX - bounds.padding.left) / bounds.plotWidth;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      setViewport((prev) => zoomViewport(prev, factor, anchorRatio));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [bounds.padding.left, bounds.plotWidth]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Grid & Axes
    drawGridAndAxes(ctx, bounds, timeLabels);

    const showBoxes = overlayMode === "all" || overlayMode === "boxes";
    const showVwap = overlayMode === "all" || overlayMode === "vwap";

    // 2. Session Range Boxes (drawn behind candles)
    if (showBoxes && priorDay && priorDay.high > 0) {
      drawSessionBox(
        ctx,
        {
          high: priorDay.high,
          low: priorDay.low,
          mid: priorDay.mid,
          color: "rgba(234, 179, 8, 0.85)",
          fillColor: "rgba(234, 179, 8, 0.035)",
          prefix: "PD",
        },
        bounds
      );
    }

    if (showBoxes && premarket && premarket.high > 0) {
      drawSessionBox(
        ctx,
        {
          high: premarket.high,
          low: premarket.low,
          mid: premarket.mid,
          color: "rgba(56, 189, 248, 0.85)",
          fillColor: "rgba(56, 189, 248, 0.035)",
          prefix: "PM",
        },
        bounds
      );
    }

    // 3. Intraday Candlesticks
    drawCandlesticks(ctx, visibleCandles, bounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
    });

    // 4. VWAP Line
    if (showVwap && vwapPoints.length > 1) {
      drawLineSeries(ctx, vwapPoints, bounds, {
        color: mergedColors.vwap,
        lineWidth: 2,
        lineStyle: "solid",
      });
    }

    // 5. VorteX Watermark
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }

    // 6. Ruler measurement
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }

    // 7. Crosshair on hover
    if (hover && hover.candle && !ruler.active) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, true);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    visibleCandles,
    priorDay,
    premarket,
    vwapPoints,
    overlayMode,
    timeLabels,
    hover,
    ruler,
    showWatermark,
    mergedColors,
  ]);

  // Mouse / Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);

    if (e.shiftKey || isRulerToolActive) {
      const point = {
        x: mouseX,
        y: mouseY,
        price,
        time: candle?.t,
        index: viewport.startIndex + localIdx,
      };
      setRuler({
        active: true,
        startPoint: point,
        currentPoint: point,
      });
    } else {
      dragRef.current = {
        isDragging: true,
        hasMoved: false,
        startX: mouseX,
        initialViewport: viewport,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);

    if (ruler.active && ruler.startPoint) {
      setRuler((prev) => ({
        ...prev,
        currentPoint: {
          x: mouseX,
          y: mouseY,
          price,
          time: candle?.t,
          index: viewport.startIndex + localIdx,
        },
      }));
      return;
    }

    if (dragRef.current.isDragging) {
      const deltaX = mouseX - dragRef.current.startX;
      if (Math.abs(deltaX) > 3) {
        dragRef.current.hasMoved = true;
      }
      const barWidth = bounds.plotWidth / Math.max(1, visibleCandles.length);
      const deltaBars = Math.round(deltaX / barWidth);
      setViewport(panViewport(dragRef.current.initialViewport, deltaBars));
      setHover(null);
      return;
    }

    setHover({ mouseX, mouseY, index: localIdx, candle });
  };

  const handleMouseUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
    }
  };

  const handleMouseLeave = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };

  // Keyboard shortcut (Escape clears ruler)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRuler({ active: false, startPoint: null, currentPoint: null });
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isZoomed = isViewportZoomed(viewport);
  const zoomLevel = getZoomLevel(viewport);

  const hoverMetrics = useMemo(() => {
    if (!hover?.candle) return null;
    const change = formatChange(hover.candle.open, hover.candle.close);
    const vol = formatVolume(hover.candle.volume);
    return { ...change, volumeStr: vol };
  }, [hover]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleReset}
        className={`block w-full h-full ${
          ruler.active || isRulerToolActive
            ? "cursor-crosshair"
            : dragRef.current.isDragging
            ? "cursor-grabbing"
            : isZoomed
            ? "cursor-grab"
            : "cursor-crosshair"
        }`}
      />

      {/* Floating Interactive Controls */}
      {showControls && sortedCandles.length > 0 && (
        <VortexChartControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          isZoomed={isZoomed}
          zoomLevel={zoomLevel}
          isRulerActive={isRulerToolActive || ruler.active}
          onToggleRuler={toggleRuler}
        />
      )}

      {/* Enhanced Floating Glassmorphism Tooltip */}
      {hover && hover.candle && !ruler.active && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all">
          <span className="font-semibold text-zinc-300">
            {formatCandleTime(hover.candle.t, true)}
          </span>
          <div className="h-3 w-px bg-white/15" />
          <span>
            <strong className="text-zinc-500 font-normal">O: </strong>
            <span className="text-white">${formatPrice(hover.candle.open)}</span>
          </span>
          <span>
            <strong className="text-zinc-500 font-normal">H: </strong>
            <span className="text-white">${formatPrice(hover.candle.high)}</span>
          </span>
          <span>
            <strong className="text-zinc-500 font-normal">L: </strong>
            <span className="text-white">${formatPrice(hover.candle.low)}</span>
          </span>
          <span>
            <strong className="text-zinc-500 font-normal">C: </strong>
            <span
              className={`font-bold ${
                hover.candle.close >= hover.candle.open ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ${formatPrice(hover.candle.close)}
            </span>
          </span>

          {hoverMetrics && (
            <>
              <div className="h-3 w-px bg-white/15" />
              <span
                className={`font-medium ${
                  hoverMetrics.isBullish ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {hoverMetrics.text}
              </span>
              {hoverMetrics.volumeStr !== "-" && (
                <>
                  <div className="h-3 w-px bg-white/15" />
                  <span className="text-zinc-400">
                    <strong className="text-zinc-500 font-normal">Vol: </strong>
                    <span className="text-zinc-200">{hoverMetrics.volumeStr}</span>
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
