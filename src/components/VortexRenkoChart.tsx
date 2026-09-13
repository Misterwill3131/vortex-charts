import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeRenkoBricks, drawRenkoBricks, type RenkoBrick } from "../engine/renko";
import { drawGenericCrosshair } from "../engine/interaction";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexRenkoChartProps {
  data: Candle[];
  brickSize?: number;
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexRenkoChart: React.FC<VortexRenkoChartProps> = ({
  data,
  brickSize = 1.0,
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

  const bricks: RenkoBrick[] = useMemo(() => {
    return computeRenkoBricks(data, brickSize);
  }, [data, brickSize]);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    bricks.forEach((b) => {
      allPrices.push(b.high, b.low, b.open, b.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [bricks, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawRenkoBricks(ctx, bricks, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, bricks, upColor, downColor, showWatermark, theme, canvasRef]);

  // 60 FPS overlay crosshair snapped to active Renko brick
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && bricks[hoverIndex]) {
      const b = bricks[hoverIndex];
      const snapX = indexToX(hoverIndex, bricks.length, bounds);
      const snapY = priceToY(b.close, bounds);
      const color = b.isUp ? (theme.colors?.bullish ?? upColor) : (theme.colors?.bearish ?? downColor);

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Brick #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(b.close)}`,
        color,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, bricks, upColor, downColor, theme]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!bricks || bricks.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, bricks.length);
    const idx = Math.max(0, Math.min(bricks.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const hovered = hoverIndex !== null ? bricks[hoverIndex] : null;

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
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 75, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="font-semibold text-white">Brick #{hoverIndex! + 1}</span>
            <span className={`text-[10px] font-bold ${hovered.isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {hovered.isUp ? "BULLISH" : "BEARISH"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-zinc-400">Open: ${formatPrice(hovered.open)}</span>
            <span className="text-white font-bold">Close: ${formatPrice(hovered.close)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
