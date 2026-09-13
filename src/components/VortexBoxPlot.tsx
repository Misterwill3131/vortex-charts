import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeBoxPlotStats, drawBoxPlot, type BoxPlotItem } from "../engine/box-plot";
import { formatPrice } from "../utils/chart-defaults";

export type BoxPlotInputItem = BoxPlotItem | { label: string; values: number[] };

export interface VortexBoxPlotProps {
  data: BoxPlotInputItem[];
  height?: number;
  className?: string;
  boxColor?: string;
  medianColor?: string;
  whiskerColor?: string;
  outlierColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexBoxPlot: React.FC<VortexBoxPlotProps> = ({
  data,
  height = 360,
  className = "",
  boxColor = "rgba(56, 189, 248, 0.35)",
  medianColor = "#eab308",
  whiskerColor = "rgba(255, 255, 255, 0.4)",
  outlierColor = "#f43f5e",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const normalizedItems: BoxPlotItem[] = useMemo(() => {
    return data.map((item) => {
      if ("values" in item && Array.isArray(item.values)) {
        return computeBoxPlotStats(item.values, item.label);
      }
      return item as BoxPlotItem;
    });
  }, [data]);

  const bounds: ChartBounds = useMemo(() => {
    const allValues: number[] = [];
    normalizedItems.forEach((it) => {
      allValues.push(it.min, it.q1, it.median, it.q3, it.max);
      if (it.outliers) {
        allValues.push(...it.outliers);
      }
    });
    return computeBounds(allValues, containerWidth, height);
  }, [normalizedItems, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawBoxPlot(ctx, normalizedItems, bounds, {
      boxColor,
      medianColor,
      whiskerColor,
      outlierColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, normalizedItems, boxColor, medianColor, whiskerColor, outlierColor, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!normalizedItems || normalizedItems.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, normalizedItems.length);
    const idx = Math.max(0, Math.min(normalizedItems.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? normalizedItems[hoverIndex] : null;

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
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2.5 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="font-semibold text-white">{hovered.label}:</span>
          <span>Min: <strong className="text-zinc-400">${formatPrice(hovered.min)}</strong></span>
          <span>Q1: <strong className="text-sky-400">${formatPrice(hovered.q1)}</strong></span>
          <span>Median: <strong className="text-amber-400">${formatPrice(hovered.median)}</strong></span>
          <span>Q3: <strong className="text-sky-400">${formatPrice(hovered.q3)}</strong></span>
          <span>Max: <strong className="text-zinc-400">${formatPrice(hovered.max)}</strong></span>
          {hovered.outliers && hovered.outliers.length > 0 && (
            <span>Outliers: <strong className="text-rose-400">{hovered.outliers.length}</strong></span>
          )}
        </div>
      )}
    </div>
  );
};
