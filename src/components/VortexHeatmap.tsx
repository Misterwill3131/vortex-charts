import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawHeatmap, type HeatmapData } from "../engine/heatmap";

export interface VortexHeatmapProps {
  data: HeatmapData;
  height?: number;
  className?: string;
  colorScale?: "vortex" | "coolwarm" | "emerald";
  showValues?: boolean;
  cellPadding?: number;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexHeatmap: React.FC<VortexHeatmapProps> = ({
  data,
  height = 360,
  className = "",
  colorScale = "vortex",
  showValues = true,
  cellPadding = 2.5,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

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

    drawHeatmap(ctx, data, bounds, {
      colorScale,
      showValues,
      cellPadding,
      hoveredCell: hoveredCell ? { row: hoveredCell.row, col: hoveredCell.col } : null,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, colorScale, showValues, cellPadding, hoveredCell, showWatermark, theme, canvasRef]);

  const numCols = data.xLabels.length;
  const numRows = data.yLabels.length;

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (numCols === 0 || numRows === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const left = bounds.padding.left;
    const top = bounds.padding.top;
    const plotW = bounds.plotWidth;
    const plotH = bounds.plotHeight;

    if (mouseX < left || mouseX > left + plotW || mouseY < top || mouseY > top + plotH) {
      setHoveredCell(null);
      return;
    }

    const col = Math.floor(((mouseX - left) / plotW) * numCols);
    const row = Math.floor(((mouseY - top) / plotH) * numRows);

    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      const val = data.values[row]?.[col] ?? 0;
      setHoveredCell({ row, col, val });
    } else {
      setHoveredCell(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredCell(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hoveredCell && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="text-zinc-400 font-semibold">{data.yLabels[hoveredCell.row] || `Row ${hoveredCell.row + 1}`}</span>
          <span className="text-zinc-500">x</span>
          <span className="text-white font-semibold">{data.xLabels[hoveredCell.col] || `Col ${hoveredCell.col + 1}`}</span>
          <span className="text-zinc-500">|</span>
          <span>Correlation: <strong className="text-sky-400">{hoveredCell.val.toFixed(2)}</strong></span>
        </div>
      )}
    </div>
  );
};
