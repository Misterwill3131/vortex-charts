import React, { useEffect, useMemo } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawRadarChart, type RadarDimension, type RadarSeries } from "../engine/radar";

export interface VortexRadarChartProps {
  dimensions: RadarDimension[];
  series: RadarSeries[];
  height?: number;
  className?: string;
  levels?: number;
  gridColor?: string;
  labelColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

const DEFAULT_SERIES_COLORS = [
  "#38bdf8",
  "#10b981",
  "#f43f5e",
  "#c084fc",
  "#eab308",
];

export const VortexRadarChart: React.FC<VortexRadarChartProps> = ({
  dimensions,
  series,
  height = 360,
  className = "",
  levels = 4,
  gridColor = "rgba(255, 255, 255, 0.08)",
  labelColor = "#94a3b8",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();

  const normalizedSeries = useMemo(() => {
    return series.map((s, idx) => ({
      ...s,
      color: s.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length],
    }));
  }, [series]);

  const bounds: ChartBounds = useMemo(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawRadarChart(ctx, dimensions, normalizedSeries, bounds, {
      levels,
      gridColor,
      labelColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, dimensions, normalizedSeries, levels, gridColor, labelColor, showWatermark, theme, canvasRef]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      {/* Top series legend */}
      <div className="absolute top-2.5 right-4 z-20 flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
        {normalizedSeries.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-zinc-300 font-mono text-[11px]">{s.name}</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />
    </div>
  );
};
