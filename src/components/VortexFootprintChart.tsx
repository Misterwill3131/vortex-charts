import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawFootprintChart, type FootprintBar } from "../engine/footprint";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexFootprintChartProps {
  data: FootprintBar[];
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  bidColor?: string;
  askColor?: string;
  showText?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexFootprintChart: React.FC<VortexFootprintChartProps> = ({
  data,
  height = 360,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  bidColor = "rgba(244, 63, 94, 0.4)",
  askColor = "rgba(16, 185, 129, 0.4)",
  showText = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    data.forEach((b) => {
      allPrices.push(b.high, b.low, b.open, b.close);
      b.levels.forEach((lvl) => allPrices.push(lvl.price));
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [data, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawFootprintChart(ctx, data, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
      bidColor,
      askColor,
      showText,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, upColor, downColor, bidColor, askColor, showText, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

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
          <span className="text-zinc-400 font-semibold">Bar #{hoverIndex! + 1}:</span>
          <span>Vol: <strong className="text-white">{hovered.totalVolume.toLocaleString()}</strong></span>
          <span>O: <strong className="text-white">${formatPrice(hovered.open)}</strong></span>
          <span>C: <strong className={hovered.close >= hovered.open ? "text-emerald-400" : "text-rose-400"}>${formatPrice(hovered.close)}</strong></span>
          <span>Levels: <strong className="text-sky-400">{hovered.levels.length}</strong></span>
        </div>
      )}
    </div>
  );
};
