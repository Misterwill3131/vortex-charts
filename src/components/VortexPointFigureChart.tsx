import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computePointAndFigure, drawPointAndFigure, type PnFColumn } from "../engine/point-figure";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexPointFigureChartProps {
  data: Candle[];
  boxSize?: number;
  reversal?: number;
  height?: number;
  className?: string;
  xColor?: string;
  oColor?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexPointFigureChart: React.FC<VortexPointFigureChartProps> = ({
  data,
  boxSize = 1.0,
  reversal = 3,
  height = 340,
  className = "",
  xColor = "#10b981",
  oColor = "#f43f5e",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const columns: PnFColumn[] = useMemo(() => {
    return computePointAndFigure(data, boxSize, reversal);
  }, [data, boxSize, reversal]);

  const bounds: ChartBounds = useMemo(() => {
    const allBoxes: number[] = [];
    columns.forEach((col) => {
      col.boxes.forEach((b) => allBoxes.push(b));
    });
    return computeBounds(allBoxes, containerWidth, height);
  }, [columns, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawPointAndFigure(ctx, columns, bounds, boxSize, {
      xColor: theme.colors?.bullish ?? xColor,
      oColor: theme.colors?.bearish ?? oColor,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, columns, boxSize, xColor, oColor, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!columns || columns.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, columns.length);
    const idx = Math.max(0, Math.min(columns.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? columns[hoverIndex] : null;

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
          <span className="text-zinc-400 font-semibold">Col #{hoverIndex! + 1}:</span>
          <span>Type: <strong className={hovered.type === "X" ? "text-emerald-400" : "text-rose-400"}>{hovered.type}</strong></span>
          <span>Boxes: <strong className="text-white">{hovered.boxes.length}</strong></span>
          {hovered.boxes.length > 0 && (
            <span>Range: <strong className="text-white">${formatPrice(Math.min(...hovered.boxes))} - ${formatPrice(Math.max(...hovered.boxes))}</strong></span>
          )}
        </div>
      )}
    </div>
  );
};
