import React, { useEffect, useRef, useState, useMemo } from "react";
import type { Candle, PriceLine } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX, xToIndex, yToPrice } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, type HoverState } from "../engine/interaction";
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
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hover, setHover] = useState<HoverState | null>(null);

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

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

  // Deduplicate and sort candles chronologically
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

  // Compute bounds
  const bounds = useMemo(() => {
    const prices: number[] = [];
    sortedCandles.forEach((c) => {
      prices.push(c.high, c.low);
    });
    allLines.forEach((l) => {
      if (typeof l.price === "number") prices.push(l.price);
    });
    return computeBounds(prices, containerWidth, height);
  }, [sortedCandles, allLines, containerWidth, height]);

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
      const text = formatCandleTime(c.t, isIntraday);
      labels.push({ x, text });
    }
    return labels;
  }, [sortedCandles, containerWidth, bounds, isIntraday]);

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

    // 2. Candlesticks
    drawCandlesticks(ctx, sortedCandles, bounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
    });

    // 3. Price Lines & Right Badges
    drawPriceLines(ctx, allLines, bounds);

    // 4. VorteX Watermark (Proprietary branding)
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }

    // 5. Crosshair on hover
    if (hover && hover.candle) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, isIntraday);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [containerWidth, height, bounds, sortedCandles, allLines, timeLabels, hover, showWatermark, mergedColors, isIntraday]);

  // Mouse handlers for crosshair & tooltip
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

      {/* Floating Glassmorphism Tooltip */}
      {hover && hover.candle && (
        <div className="pointer-events-none absolute top-2 left-3 z-20 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-[11px] backdrop-blur-md shadow-lg tabular-nums">
          <span className="font-semibold text-zinc-400">
            {formatCandleTime(hover.candle.t, isIntraday)}
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
