import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeRenkoBricks, drawRenkoBricks, type RenkoBrick } from "../engine/renko";
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

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!bricks || bricks.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, bricks.length);
    const idx = Math.max(0, Math.min(bricks.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
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
        onPointerLeave={() => setHoverIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="text-zinc-400 font-semibold">Brick #{hoverIndex! + 1}:</span>
          <span>Type: <strong className={hovered.isUp ? "text-emerald-400" : "text-rose-400"}>{hovered.isUp ? "UP" : "DOWN"}</strong></span>
          <span>Open: <strong className="text-white">${formatPrice(hovered.open)}</strong></span>
          <span>Close: <strong className="text-white">${formatPrice(hovered.close)}</strong></span>
        </div>
      )}
    </div>
  );
};
