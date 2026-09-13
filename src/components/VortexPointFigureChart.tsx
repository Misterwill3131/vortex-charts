import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computePointAndFigure, drawPointAndFigure, type PnFColumn } from "../engine/point-figure";
import { drawGenericCrosshair } from "../engine/interaction";
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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

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

  // 60 FPS overlay crosshair snapped to active P&F column
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && columns[hoverIndex]) {
      const col = columns[hoverIndex];
      const snapX = indexToX(hoverIndex, columns.length, bounds);
      const topPrice = Math.max(...col.boxes);
      const snapY = priceToY(topPrice, bounds);
      const color = col.type === "X" ? (theme.colors?.bullish ?? xColor) : (theme.colors?.bearish ?? oColor);

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Col #${hoverIndex + 1} (${col.type})`,
        yLabel: `$${formatPrice(topPrice)}`,
        color,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, columns, xColor, oColor, theme]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!columns || columns.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, columns.length);
    const idx = Math.max(0, Math.min(columns.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
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
        onPointerLeave={handlePointerLeave}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 180, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 75, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="font-semibold text-white">Column #{hoverIndex! + 1}</span>
            <span className={`text-[10px] font-bold ${hovered.type === "X" ? "text-emerald-400" : "text-rose-400"}`}>
              {hovered.type === "X" ? "X (DEMAND)" : "O (SUPPLY)"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-zinc-400">Boxes: {hovered.boxes.length}</span>
            {hovered.boxes.length > 0 && (
              <span className="text-white font-bold">
                ${formatPrice(Math.min(...hovered.boxes))} - ${formatPrice(Math.max(...hovered.boxes))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
