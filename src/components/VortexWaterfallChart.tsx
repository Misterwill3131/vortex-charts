import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawWaterfallChart, type WaterfallBar } from "../engine/waterfall";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexWaterfallChartProps {
  data: WaterfallBar[];
  height?: number;
  className?: string;
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  connectorColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexWaterfallChart: React.FC<VortexWaterfallChartProps> = ({
  data,
  height = 360,
  className = "",
  positiveColor = "#10b981",
  negativeColor = "#f43f5e",
  totalColor = "#38bdf8",
  connectorColor = "rgba(255, 255, 255, 0.2)",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const bounds: ChartBounds = useMemo(() => {
    let running = 0;
    const values: number[] = [0];
    data.forEach((b) => {
      if (b.isTotal) {
        running = b.value;
      } else {
        running += b.value;
      }
      values.push(running);
    });
    return computeBounds(values, containerWidth, height);
  }, [data, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawWaterfallChart(ctx, data, bounds, {
      positiveColor: theme.colors?.bullish ?? positiveColor,
      negativeColor: theme.colors?.bearish ?? negativeColor,
      totalColor,
      connectorColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, positiveColor, negativeColor, totalColor, connectorColor, showWatermark, theme, canvasRef]);

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
          <span className="font-semibold text-white">{hovered.label}</span>
          <span>Delta: <strong className={hovered.value >= 0 ? "text-emerald-400" : "text-rose-400"}>{hovered.value >= 0 ? "+" : ""}${formatPrice(hovered.value)}</strong></span>
          {hovered.isTotal && <span className="text-sky-400 font-semibold">(Total)</span>}
        </div>
      )}
    </div>
  );
};
