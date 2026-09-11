import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Candle, PriceLine } from "../types";
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
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, formatChange, formatVolume, type HoverState } from "../engine/interaction";
import { drawRulerOverlay, type RulerState } from "../engine/ruler";
import { VortexChartControls } from "./VortexChartControls";
import { setupCanvasDpi } from "../engine/canvas";
import { formatCandleTime, formatPrice } from "../utils/chart-defaults";

export interface VortexCandleChartProps {
  candles: Candle[];
  priceLines?: PriceLine[];
  swingHigh?: number;
  swingLow?: number;
  spotPrice?: number;
  atrBounds?: { upper?: number; lower?: number };
  height?: number;
  className?: string;
  timeVisible?: boolean;
  isIntraday?: boolean;
  showWatermark?: boolean;
  showControls?: boolean;
  theme?: Partial<typeof VORTEX_THEME>;
}

export const VortexCandleChart: React.FC<VortexCandleChartProps> = ({
  candles,
  priceLines = [],
  swingHigh,
  swingLow,
  spotPrice,
  atrBounds,
  height = 300,
  className = "",
  isIntraday = false,
  showWatermark = true,
  showControls = true,
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Deduplicate and sort candles chronologically
  const sortedCandles = useMemo(() => {
    return Array.from(
      new Map(candles.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles]);

  // Interactive Viewport State (Zoom & Pan)
  const [viewport, setViewport] = useState<ViewportState>(() =>
    createViewport(sortedCandles.length, 6)
  );

  // Sync viewport when candle count significantly changes
  useEffect(() => {
    setViewport((prev) => {
      if (prev.totalCount === sortedCandles.length) return prev;
      return createViewport(sortedCandles.length, 6);
    });
  }, [sortedCandles.length]);

  // Ruler state (Shift+Drag measurement)
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

  // Combine convenience props into price lines
  const allLines = useMemo(() => {
    const list: PriceLine[] = [...priceLines];

    if (typeof swingHigh === "number" && swingHigh > 0) {
      list.push({
        price: swingHigh,
        color: mergedColors.bearish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D High $${formatPrice(swingHigh)}`,
        axisLabelVisible: true,
      });
    }

    if (typeof swingLow === "number" && swingLow > 0) {
      list.push({
        price: swingLow,
        color: mergedColors.bullish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D Low $${formatPrice(swingLow)}`,
        axisLabelVisible: true,
      });
    }

    if (typeof spotPrice === "number" && spotPrice > 0) {
      list.push({
        price: spotPrice,
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        title: `Spot $${formatPrice(spotPrice)}`,
        axisLabelVisible: true,
      });
    }

    if (atrBounds?.upper && atrBounds.upper > 0) {
      list.push({
        price: atrBounds.upper,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Upper",
        axisLabelVisible: false,
      });
    }

    if (atrBounds?.lower && atrBounds.lower > 0) {
      list.push({
        price: atrBounds.lower,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Lower",
        axisLabelVisible: false,
      });
    }

    return list;
  }, [priceLines, swingHigh, swingLow, spotPrice, atrBounds, mergedColors]);

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

  // Compute adaptive bounds from visible window (Auto-scale vertical price axis)
  const bounds = useMemo(() => {
    const prices: number[] = [];
    visibleCandles.forEach((c) => {
      prices.push(c.high, c.low);
    });
    allLines.forEach((l) => {
      if (typeof l.price === "number") prices.push(l.price);
    });
    return computeBounds(prices, containerWidth, height);
  }, [visibleCandles, allLines, containerWidth, height]);

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
      const text = formatCandleTime(c.t, isIntraday);
      labels.push({ x, text });
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds, isIntraday]);

  // Interactive Viewport Controls
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setViewport(resetViewport(sortedCandles.length, 6));
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

    // 2. Visible Candlesticks
    drawCandlesticks(ctx, visibleCandles, bounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
    });

    // 3. Price Lines & Right Badges
    drawPriceLines(ctx, allLines, bounds);

    // 4. VorteX Watermark (Official branding)
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }

    // 5. Ruler Measurement Overlay (Shift-drag)
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }

    // 6. Crosshair on hover (when not actively measuring)
    if (hover && hover.candle && !ruler.active) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, isIntraday);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    visibleCandles,
    allLines,
    timeLabels,
    hover,
    ruler,
    showWatermark,
    mergedColors,
    isIntraday,
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
      // Start measurement
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
      // Start Pan Dragging
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

    // Handle Active Ruler Drag
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

    // Handle Active Pan Dragging
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

    // Default: Hover Crosshair & Tooltip
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

  // Compute change metrics for hover tooltip
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

      {/* Floating Interactive Controls (Zoom, Pan, Reset, Measure) */}
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
            {formatCandleTime(hover.candle.t, isIntraday)}
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
