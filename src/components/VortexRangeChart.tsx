import React, { useEffect, useRef, useState, useMemo } from "react";
import type { Candle, PriorDayRange, PremarketRange, VwapPoint } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX, xToIndex, yToPrice } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawSessionBox } from "../engine/boxes";
import { drawLineSeries, type DataPoint } from "../engine/lines";
import { drawVortexWatermark, VortexWatermarkOverlay } from "../engine/watermark";
import { drawCrosshair, type HoverState } from "../engine/interaction";
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
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hover, setHover] = useState<HoverState | null>(null);

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

  // Deduplicate and sort intraday candles
  const sortedCandles = useMemo(() => {
    return Array.from(
      new Map(candles.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles]);

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

  // Compute price bounds
  const bounds = useMemo(() => {
    const prices: number[] = [];
    sortedCandles.forEach((c) => prices.push(c.high, c.low));

    if (priorDay && priorDay.high > 0) prices.push(priorDay.high, priorDay.low);
    if (premarket && premarket.high > 0) prices.push(premarket.high, premarket.low);
    vwapSeries.forEach((v) => {
      if (typeof v.vwap === "number" && v.vwap > 0) prices.push(v.vwap);
    });

    return computeBounds(prices, containerWidth, height);
  }, [sortedCandles, priorDay, premarket, vwapSeries, containerWidth, height]);

  // Generate bottom time labels
  const timeLabels = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    const count = sortedCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));

    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < count; i += step) {
      const c = sortedCandles[i];
      const x = indexToX(i, count, bounds);
      const text = formatCandleTime(c.t, true);
      labels.push({ x, text });
    }
    return labels;
  }, [sortedCandles, containerWidth, bounds]);

  // Map VWAP series to X coordinates matching closest candles
  const vwapPoints = useMemo<DataPoint[]>(() => {
    if (vwapSeries.length === 0 || sortedCandles.length === 0) return [];

    const points: DataPoint[] = [];
    const candleCount = sortedCandles.length;

    // Create time lookup map
    vwapSeries.forEach((v) => {
      // Find closest candle index
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < candleCount; i++) {
        const diff = Math.abs(sortedCandles[i].t - v.t);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      const x = indexToX(closestIdx, candleCount, bounds);
      points.push({ x, price: v.vwap });
    });

    return points;
  }, [vwapSeries, sortedCandles, bounds]);

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
      drawSessionBox(ctx, {
        high: priorDay.high,
        low: priorDay.low,
        mid: priorDay.mid,
        color: "rgba(234, 179, 8, 0.85)",
        fillColor: "rgba(234, 179, 8, 0.035)",
        prefix: "PD",
      }, bounds);
    }

    if (showBoxes && premarket && premarket.high > 0) {
      drawSessionBox(ctx, {
        high: premarket.high,
        low: premarket.low,
        mid: premarket.mid,
        color: "rgba(56, 189, 248, 0.85)",
        fillColor: "rgba(56, 189, 248, 0.035)",
        prefix: "PM",
      }, bounds);
    }

    // 3. Intraday Candlesticks
    drawCandlesticks(ctx, sortedCandles, bounds, {
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

    // 6. Crosshair on hover
    if (hover && hover.candle) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, true);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    sortedCandles,
    priorDay,
    premarket,
    vwapPoints,
    overlayMode,
    timeLabels,
    hover,
    showWatermark,
    mergedColors,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || sortedCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const idx = xToIndex(mouseX, sortedCandles.length, bounds);
    const candle = sortedCandles[idx] || null;

    setHover({ mouseX, mouseY, index: idx, candle });
  };

  const handleMouseLeave = () => {
    setHover(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair block"
      />

      {/* Official VorteX Branding Overlay */}
      {showWatermark && <VortexWatermarkOverlay />}

      {/* Floating Glassmorphism Tooltip */}
      {hover && hover.candle && (
        <div className="pointer-events-none absolute top-2 left-3 z-20 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] backdrop-blur-md shadow-lg tabular-nums">
          <span className="font-semibold text-zinc-400">
            {formatCandleTime(hover.candle.t, true)}
          </span>
          <div className="h-3 w-px bg-white/10" />
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
        </div>
      )}
    </div>
  );
};
