import React, { useEffect, useMemo, useState } from "react";
import type { Candle, PriceLine } from "../types";
import { VORTEX_THEME, type VortexThemeOverride } from "../theme/tokens";
import {
  computeBounds,
  indexToX,
  nearestTimeIndex,
  timeToX,
  type TimeScaleMapping,
} from "../engine/coordinates";
import type { ChartZone } from "../engine/zones";
import { drawChartZones } from "../engine/zones";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, drawRemoteCrosshair, formatChange, formatVolume } from "../engine/interaction";
import { drawRulerOverlay } from "../engine/ruler";
import { VortexChartControls } from "./VortexChartControls";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { useChartViewport } from "../hooks/useChartViewport";
import { useChartPointer } from "../hooks/useChartPointer";
import { useCrosshairSync } from "../hooks/useCrosshairSync";
import { formatCandleTime, formatPrice } from "../utils/chart-defaults";

export interface VortexCandleChartProps {  candles: Candle[];
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
  /**
   * Map X by real timestamps instead of bar index: weekends / market pauses
   * render as proportional empty space (recommended for daily+ timeframes).
   */
  timeScale?: boolean;
  /** Share this id across charts to synchronize their crosshairs */
  crosshairSyncGroup?: string;
  /**
   * Time-anchored zones drawn behind the candles (FVG gaps, imbalances,
   * opening ranges). Each zone starts at its anchor candle and extends to
   * the right edge of the plot.
   */
  zones?: ChartZone[];
  /**
   * "reset" (default): full view when the series length changes.
   * "follow": keep the zoom span, slide to the newest bars (live charts).
   */
  viewportMode?: "reset" | "follow";
  /** Open the chart on the last N bars instead of the full series */
  initialVisibleBars?: number;
  /** Pin time labels to a market timezone, e.g. "America/New_York" */
  timeZone?: string;
  theme?: VortexThemeOverride;
}

// Module-level fallback so the merged-colors memo keeps a STABLE identity when
// no theme is passed. With the old `dep: [theme]` + `theme = {}` default, the
// memo was invalidated on every render and the main canvas effect (which
// depends on mergedColors) fully redrew the candles at pointermove frame
// rate — the root cause of the /account/levels FPS loss.
const EMPTY_COLORS = {} as Record<string, never>;

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
  timeScale = false,
  crosshairSyncGroup,
  zones,
  viewportMode = "reset",
  initialVisibleBars,
  timeZone,
  theme = {},
}) => {
  // Deduplicate and sort candles chronologically
  const sortedCandles = useMemo(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);

  // â”€â”€ Surface: container refs, width tracking, devicePixelRatio â”€â”€
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();

  // â”€â”€ Viewport: zoom & pan state â”€â”€
  const { viewport, setViewport, zoomIn, zoomOut, resetView, isZoomed, zoomLevel } =
    useChartViewport(sortedCandles.length, 6, {
      mode: viewportMode,
      initialVisibleBars,
    });

  const mergedColors = useMemo(
    () => ({ ...VORTEX_THEME.colors, ...(theme.colors ?? EMPTY_COLORS) }),
    [theme.colors]
  );

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

  // Time-based X mapping (gap-aware) derived from the visible window
  const timeScaleMapping = useMemo<TimeScaleMapping | null>(() => {
    if (!timeScale || visibleCandles.length < 2) return null;
    const tMin = visibleCandles[0].t;
    const tMax = visibleCandles[visibleCandles.length - 1].t;
    return tMax > tMin ? { tMin, tMax } : null;
  }, [timeScale, visibleCandles]);

  // Generate bottom time labels for visible slice
  const timeLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));

    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = timeScaleMapping
        ? timeToX(c.t, timeScaleMapping, chartBounds)
        : indexToX(i, count, chartBounds);
      labels.push({ x, text: formatCandleTime(c.t, isIntraday, timeZone) });
    }
    return labels;
  }, [visibleCandles, containerWidth, chartBounds, isIntraday, timeScaleMapping, timeZone]);

  // â”€â”€ Pointer interaction: hover crosshair, ruler, drag pan, wheel zoom â”€â”€
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, pointerHandlers } =
    useChartPointer({
      canvasRef,
      bounds: chartBounds,
      visible: visibleCandles,
      indexOffset: viewport.startIndex,
      timeScale: timeScaleMapping,
      panZoom: true,
      viewport,
      onViewportChange: setViewport,
    });

  // â”€â”€ Multi-chart crosshair synchronization â”€â”€
  const [remoteHoverTime, setRemoteHoverTime] = useState<number | null>(null);
  useCrosshairSync({
    group: crosshairSyncGroup,
    localTime: hover?.candle?.t ?? null,
    onRemoteTime: setRemoteHoverTime,
  });

  const handleReset = () => {
    resetView();
    clearRuler();
  };

  // â”€â”€ Main canvas: redraw ONLY when data / viewport / size changes (not on hover) â”€â”€
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Grid & Axes
    drawGridAndAxes(ctx, chartBounds, timeLabels);

    // 2. Zones behind candles (FVG gaps, imbalancesâ€¦) â€” drawn before candles
    if (zones && zones.length > 0) {
      drawChartZones(ctx, chartBounds, zones, visibleCandles);
    }

    // 3. Visible Candlesticks (gap-aware when timeScale is enabled)
    drawCandlesticks(
      ctx,
      visibleCandles,
      chartBounds,
      {
        upColor: mergedColors.bullish,
        downColor: mergedColors.bearish,
      },
      timeScaleMapping
    );

    // 4. Price Lines & Right Badges
    drawPriceLines(ctx, allLines, chartBounds);

    // 5. VorteX Watermark (Official branding)
    if (showWatermark) {
      drawVortexWatermark(ctx, chartBounds);
    }
  }, [containerWidth, height, dpr, chartBounds, visibleCandles, allLines, timeLabels, timeScaleMapping, zones, showWatermark, mergedColors, canvasRef]);

  // â”€â”€ Overlay canvas: lightweight crosshair + ruler, redrawn on hover only â”€â”€
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
      drawCrosshair(ctx, chartBounds, hover, formatCandleTime(hover.candle.t, isIntraday, timeZone));
    }

    // 3. Remote crosshair from the sync group (ghost line at the nearest bar)
    if (!hover && remoteHoverTime != null && visibleCandles.length > 0) {
      const idx = nearestTimeIndex(visibleCandles, remoteHoverTime);
      const c = idx >= 0 ? visibleCandles[idx] : null;
      if (c) {
        const tSpan = visibleCandles[visibleCandles.length - 1].t - visibleCandles[0].t;
        const avgGap = tSpan / Math.max(1, visibleCandles.length - 1);
        // Only react when a visible bar actually matches the remote time
        if (Math.abs(c.t - remoteHoverTime) <= Math.max(avgGap, 60_000)) {
          const x = timeScaleMapping
            ? timeToX(c.t, timeScaleMapping, chartBounds)
            : indexToX(idx, visibleCandles.length, chartBounds);
          drawRemoteCrosshair(ctx, chartBounds, x);
        }
      }
    }
  }, [containerWidth, height, dpr, chartBounds, hover, ruler, remoteHoverTime, visibleCandles, timeScaleMapping, isIntraday, timeZone, overlayRef]);

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
            {formatCandleTime(hover.candle.t, isIntraday, timeZone)}
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
