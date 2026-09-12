import React, { useEffect, useMemo } from "react";
import type { Candle, PriceLine } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, formatChange, formatVolume } from "../engine/interaction";
import { drawRulerOverlay } from "../engine/ruler";
import { VortexChartControls } from "./VortexChartControls";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { useChartViewport } from "../hooks/useChartViewport";
import { useChartPointer } from "../hooks/useChartPointer";
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
  // Deduplicate and sort candles chronologically
  const sortedCandles = useMemo(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);

  // ── Surface: container refs, width tracking, devicePixelRatio ──
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();

  // ── Viewport: zoom & pan state ──
  const { viewport, setViewport, zoomIn, zoomOut, resetView, isZoomed, zoomLevel } =
    useChartViewport(sortedCandles.length, 6);

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

  // Slice visible candles according to viewport
  const visibleCandles = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);

  // Compute adaptive bounds from visible window (auto-scale vertical price axis)
  const bounds = useMemo(() => {
    const prices: number[] = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));

    // Combine convenience props into price lines
    const lines: PriceLine[] = [...priceLines];
    if (typeof swingHigh === "number" && swingHigh > 0) {
      prices.push(swingHigh);
      lines.push({
        price: swingHigh,
        color: mergedColors.bearish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D High $${formatPrice(swingHigh)}`,
        axisLabelVisible: true,
      });
    }
    if (typeof swingLow === "number" && swingLow > 0) {
      prices.push(swingLow);
      lines.push({
        price: swingLow,
        color: mergedColors.bullish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D Low $${formatPrice(swingLow)}`,
        axisLabelVisible: true,
      });
    }
    if (typeof spotPrice === "number" && spotPrice > 0) {
      prices.push(spotPrice);
      lines.push({
        price: spotPrice,
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        title: `Spot $${formatPrice(spotPrice)}`,
        axisLabelVisible: true,
      });
    }
    if (atrBounds?.upper && atrBounds.upper > 0) {
      prices.push(atrBounds.upper);
      lines.push({
        price: atrBounds.upper,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Upper",
        axisLabelVisible: false,
      });
    }
    if (atrBounds?.lower && atrBounds.lower > 0) {
      prices.push(atrBounds.lower);
      lines.push({
        price: atrBounds.lower,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Lower",
        axisLabelVisible: false,
      });
    }

    return { computed: computeBounds(prices, containerWidth, height), lines };
  }, [visibleCandles, priceLines, swingHigh, swingLow, spotPrice, atrBounds, mergedColors, containerWidth, height]);

  const chartBounds = bounds.computed;
  const allLines = bounds.lines;

  // Generate bottom time labels for visible slice
  const timeLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));

    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(i, count, chartBounds);
      labels.push({ x, text: formatCandleTime(c.t, isIntraday) });
    }
    return labels;
  }, [visibleCandles, containerWidth, chartBounds, isIntraday]);

  // ── Pointer interaction: hover crosshair, ruler, drag pan, wheel zoom ──
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, pointerHandlers } =
    useChartPointer({
      canvasRef,
      bounds: chartBounds,
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
    drawGridAndAxes(ctx, chartBounds, timeLabels);

    // 2. Visible Candlesticks
    drawCandlesticks(ctx, visibleCandles, chartBounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
    });

    // 3. Price Lines & Right Badges
    drawPriceLines(ctx, allLines, chartBounds);

    // 4. VorteX Watermark (Official branding)
    if (showWatermark) {
      drawVortexWatermark(ctx, chartBounds);
    }
  }, [containerWidth, height, dpr, chartBounds, visibleCandles, allLines, timeLabels, showWatermark, mergedColors, canvasRef]);

  // ── Overlay canvas: lightweight crosshair + ruler, redrawn on hover only ──
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Ruler Measurement Overlay (Shift-drag)
    if (ruler.active) {
      drawRulerOverlay(ctx, chartBounds, ruler);
    }

    // 2. Crosshair on hover (when not actively measuring)
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, chartBounds, hover, formatCandleTime(hover.candle.t, isIntraday));
    }
  }, [containerWidth, height, dpr, chartBounds, hover, ruler, isIntraday, overlayRef]);

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

      {/* Floating Interactive Controls (Zoom, Pan, Reset, Measure) */}
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
