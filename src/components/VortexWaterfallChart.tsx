import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawWaterfallChart, type WaterfallBar } from "../engine/waterfall";
import { drawGenericCrosshair } from "../engine/interaction";
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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

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
    return computeBounds(values, containerWidth, height, { allowZeroOrNegative: true });
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

  // 60 FPS overlay crosshair snapped to active waterfall step
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && data[hoverIndex]) {
      const b = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(b.value, bounds);
      const color = b.isTotal ? totalColor : b.value >= 0 ? (theme.colors?.bullish ?? positiveColor) : (theme.colors?.bearish ?? negativeColor);

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: b.label,
        yLabel: `$${formatPrice(b.value)}`,
        color,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, positiveColor, negativeColor, totalColor, theme]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
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
        onPointerLeave={handlePointerLeave}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 70, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="font-semibold text-white">{hovered.label}</span>
            <span className={`text-[10px] font-bold ${hovered.isTotal ? "text-sky-400" : (hovered.value >= 0 ? "text-emerald-400" : "text-rose-400")}`}>
              {hovered.isTotal ? "STAGE TOTAL" : (hovered.value >= 0 ? "+CONTRIBUTION" : "-COST")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Delta:</span>
            <strong className="text-white">
              {hovered.isTotal ? "" : (hovered.value >= 0 ? "+" : "")}${formatPrice(hovered.value)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};
