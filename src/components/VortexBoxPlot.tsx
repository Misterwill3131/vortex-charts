import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeBoxPlotStats, drawBoxPlot, type BoxPlotItem } from "../engine/box-plot";
import { drawGenericCrosshair } from "../engine/interaction";
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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

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
    return computeBounds(allValues, containerWidth, height, { allowZeroOrNegative: true });
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

  // 60 FPS overlay crosshair snapped to active box plot median
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && normalizedItems[hoverIndex]) {
      const it = normalizedItems[hoverIndex];
      const snapX = indexToX(hoverIndex, normalizedItems.length, bounds);
      const snapY = priceToY(it.median, bounds);

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: it.label,
        yLabel: `Median: $${formatPrice(it.median)}`,
        color: medianColor,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, normalizedItems, medianColor]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!normalizedItems || normalizedItems.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, normalizedItems.length);
    const idx = Math.max(0, Math.min(normalizedItems.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
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
        onPointerLeave={handlePointerLeave}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 200, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 110, Math.max(10, cursorPos.y - 50)),
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="font-semibold text-white">{hovered.label}</span>
            <span className="text-[10px] text-amber-400 font-mono">Tukey 5-Pt</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div><span className="text-zinc-500">Max:</span> <strong className="text-white">${formatPrice(hovered.max)}</strong></div>
            <div><span className="text-zinc-500">Q3:</span> <strong className="text-sky-300">${formatPrice(hovered.q3)}</strong></div>
            <div><span className="text-zinc-500">Median:</span> <strong className="text-amber-400 font-bold">${formatPrice(hovered.median)}</strong></div>
            <div><span className="text-zinc-500">Q1:</span> <strong className="text-sky-300">${formatPrice(hovered.q1)}</strong></div>
            <div><span className="text-zinc-500">Min:</span> <strong className="text-white">${formatPrice(hovered.min)}</strong></div>
            {hovered.outliers && hovered.outliers.length > 0 && (
              <div><span className="text-zinc-500">Outliers:</span> <strong className="text-rose-400">{hovered.outliers.length}</strong></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
