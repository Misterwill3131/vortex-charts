import React, { useEffect, useMemo } from "react";
import type { Candle, PriorDayRange, PremarketRange, VwapPoint } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawSessionBox } from "../engine/boxes";
import { drawLineSeries, type DataPoint } from "../engine/lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, formatChange, formatVolume } from "../engine/interaction";
import { drawRulerOverlay } from "../engine/ruler";
import { VortexChartControls } from "./VortexChartControls";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { useChartViewport } from "../hooks/useChartViewport";
import { useChartPointer } from "../hooks/useChartPointer";
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
  // Deduplicate and sort intraday candles
  const sortedCandles = useMemo(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);

  // ── Surface: container refs, width tracking, devicePixelRatio ──
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();

  // ── Viewport: zoom & pan state ──
  const { viewport, setViewport, zoomIn, zoomOut, resetView, isZoomed, zoomLevel } =
    useChartViewport(sortedCandles.length, 12);

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

  // Slice visible candles according to viewport
  const visibleCandles = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);

  // Compute adaptive price bounds (auto-scale vertical price axis)
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
      labels.push({ x, text: formatCandleTime(c.t, true) });
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

  // ── Pointer interaction: hover crosshair, ruler, drag pan, wheel zoom ──
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, pointerHandlers } =
    useChartPointer({
      canvasRef,
      bounds,
      visible: visibleCandles,
      indexOffset: viewport.startIndex,
      panZoom: true,
      viewport,
      onViewportChange: setViewport,
    });

  const handleReset = () => {
    resetView();
    clearRuler();
  };

  // ── Main canvas: redraw ONLY when data / viewport / size changes (not on hover) ──
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
  }, [containerWidth, height, dpr, bounds, visibleCandles, priorDay, premarket, vwapPoints, overlayMode, timeLabels, showWatermark, mergedColors, canvasRef]);

  // ── Overlay canvas: lightweight crosshair + ruler, redrawn on hover only ──
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Ruler measurement
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }

    // 2. Crosshair on hover
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, bounds, hover, formatCandleTime(hover.candle.t, true));
    }
  }, [containerWidth, height, dpr, bounds, hover, ruler, overlayRef]);

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
        {...pointerHandlers}
        onDoubleClick={handleReset}
        className={`block h-full w-full ${
          ruler.active || isRulerToolActive ? "cursor-crosshair" : isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 block"
      />

      {/* Floating Interactive Controls */}
      {showControls && sortedCandles.length > 0 && (
        <VortexChartControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
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
