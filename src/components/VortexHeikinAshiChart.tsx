import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeHeikinAshi } from "../engine/heikin-ashi";
import { drawCandlesticks } from "../engine/candles";
import { drawGenericCrosshair } from "../engine/interaction";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexHeikinAshiChartProps {
  data: Candle[];
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexHeikinAshiChart: React.FC<VortexHeikinAshiChartProps> = ({
  data,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const haCandles = useMemo(() => computeHeikinAshi(data), [data]);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    haCandles.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [haCandles, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawCandlesticks(ctx, haCandles, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, haCandles, upColor, downColor, showWatermark, theme, canvasRef]);

  // 60 FPS overlay crosshair snapped to Heikin-Ashi candle
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && haCandles[hoverIndex]) {
      const c = haCandles[hoverIndex];
      const snapX = indexToX(hoverIndex, haCandles.length, bounds);
      const snapY = priceToY(c.close, bounds);
      const color = c.close >= c.open ? (theme.colors?.bullish ?? upColor) : (theme.colors?.bearish ?? downColor);

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `HA #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(c.close)}`,
        color,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, haCandles, upColor, downColor, theme]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!haCandles || haCandles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, haCandles.length);
    const idx = Math.max(0, Math.min(haCandles.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const hovered = hoverIndex !== null ? haCandles[hoverIndex] : null;
  const isUp = hovered ? hovered.close >= hovered.open : true;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 190, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 95, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="font-semibold text-white">Heikin-Ashi #{hoverIndex! + 1}</span>
            <span className={`text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {isUp ? "SMOOTHED BULL" : "SMOOTHED BEAR"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div><span className="text-zinc-500">O:</span> <strong className="text-white">${formatPrice(hovered.open)}</strong></div>
            <div><span className="text-zinc-500">H:</span> <strong className="text-emerald-400">${formatPrice(hovered.high)}</strong></div>
            <div><span className="text-zinc-500">L:</span> <strong className="text-rose-400">${formatPrice(hovered.low)}</strong></div>
            <div><span className="text-zinc-500">C:</span> <strong className={isUp ? "text-emerald-400" : "text-rose-400"}>${formatPrice(hovered.close)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
