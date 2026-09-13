import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeRangeBars, type TickData } from "../engine/range-bars";
import { drawCandlesticks } from "../engine/candles";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexRangeBarChartProps {
  data: (TickData | Candle)[];
  rangeSize?: number;
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexRangeBarChart: React.FC<VortexRangeBarChartProps> = ({
  data,
  rangeSize = 1.0,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const rangeCandles: Candle[] = useMemo(() => {
    return computeRangeBars(data, rangeSize);
  }, [data, rangeSize]);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    rangeCandles.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [rangeCandles, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawCandlesticks(ctx, rangeCandles, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, rangeCandles, upColor, downColor, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rangeCandles || rangeCandles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, rangeCandles.length);
    const idx = Math.max(0, Math.min(rangeCandles.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? rangeCandles[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="text-zinc-400 font-semibold">Range Bar #{hoverIndex! + 1}:</span>
          <span>O: <strong className="text-white">${formatPrice(hovered.open)}</strong></span>
          <span>H: <strong className="text-emerald-400">${formatPrice(hovered.high)}</strong></span>
          <span>L: <strong className="text-rose-400">${formatPrice(hovered.low)}</strong></span>
          <span>C: <strong className={hovered.close >= hovered.open ? "text-emerald-400" : "text-rose-400"}>${formatPrice(hovered.close)}</strong></span>
        </div>
      )}
    </div>
  );
};
