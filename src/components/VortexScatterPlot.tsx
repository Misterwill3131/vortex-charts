import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeScatterBounds, drawScatterPlot, type ScatterPoint, type ScatterBounds } from "../engine/scatter";

export interface VortexScatterPlotProps {
  data: ScatterPoint[];
  height?: number;
  className?: string;
  pointColor?: string;
  defaultRadius?: number;
  showTrendLine?: boolean;
  trendLineColor?: string;
  glow?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexScatterPlot: React.FC<VortexScatterPlotProps> = ({
  data,
  height = 360,
  className = "",
  pointColor = "#38bdf8",
  defaultRadius = 6,
  showTrendLine = false,
  trendLineColor = "#38bdf8",
  glow = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const scatterBounds: ScatterBounds = useMemo(() => {
    return computeScatterBounds(data);
  }, [data]);

  const bounds: ChartBounds = useMemo(() => {
    return computeBounds([scatterBounds.minY, scatterBounds.maxY], containerWidth, height);
  }, [scatterBounds, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawScatterPlot(ctx, data, bounds, scatterBounds, {
      pointColor: theme.colors?.spot ?? pointColor,
      defaultRadius,
      showTrendLine,
      trendLineColor,
      glow,
      hoveredIndex,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, scatterBounds, pointColor, defaultRadius, showTrendLine, trendLineColor, glow, hoveredIndex, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rangeX = Math.max(scatterBounds.maxX - scatterBounds.minX, 0.0001);
    const rangeY = Math.max(scatterBounds.maxY - scatterBounds.minY, 0.0001);

    // Find nearest point within radius threshold
    let nearestIdx: number | null = null;
    let minDist = 22; // px threshold

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const px = bounds.padding.left + ((pt.x - scatterBounds.minX) / rangeX) * bounds.plotWidth;
      const py = bounds.padding.top + (1 - (pt.y - scatterBounds.minY) / rangeY) * bounds.plotHeight;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    setHoveredIndex(nearestIdx);
  };

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hoveredPoint && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          {hoveredPoint.label && <span className="font-semibold text-white">{hoveredPoint.label}</span>}
          <span>X: <strong className="text-sky-400">{hoveredPoint.x.toFixed(2)}</strong></span>
          <span>Y: <strong className="text-emerald-400">{hoveredPoint.y.toFixed(2)}</strong></span>
          {hoveredPoint.size && (
            <span>Size: <strong className="text-zinc-400">{hoveredPoint.size}</strong></span>
          )}
        </div>
      )}
    </div>
  );
};
