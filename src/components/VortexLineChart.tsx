import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawLineChart, type LineSeriesPoint } from "../engine/line-chart";
import { drawGenericCrosshair } from "../engine/interaction";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexLineChartProps {
  data: LineSeriesPoint[];
  height?: number;
  className?: string;
  color?: string;
  showArea?: boolean;
  showPoints?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexLineChart: React.FC<VortexLineChartProps> = ({
  data,
  height = 300,
  className = "",
  color = "#38bdf8",
  showArea = true,
  showPoints = false,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const bounds: ChartBounds = useMemo(() => {
    const prices = data.map((d) => d.price);
    return computeBounds(prices, containerWidth, height);
  }, [data, containerWidth, height]);

  // 1. Static base canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawLineChart(ctx, data, bounds, {
      color: theme.colors?.spot ?? color,
      showArea,
      showPoints,
      glow: true,
      smooth: true,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, showArea, showPoints, showWatermark, theme, canvasRef]);

  // 2. High-performance 60 FPS interactive overlay crosshair & snap beacon
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && data[hoverIndex]) {
      const item = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(item.price, bounds);
      const activeColor = theme.colors?.spot ?? color;

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: item.label || `Day ${hoverIndex + 1}`,
        yLabel: `$${formatPrice(item.price)}`,
        color: activeColor,
        showSnapDot: true,
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, color, theme]);

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

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;
  const firstPrice = data[0]?.price ?? 0;
  const delta = hoveredItem && firstPrice > 0 ? hoveredItem.price - firstPrice : 0;
  const deltaPct = firstPrice > 0 ? (delta / firstPrice) * 100 : 0;

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

      {hoveredItem && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300 transition-transform duration-75"
          style={{
            left: Math.min(containerWidth - 160, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 70, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="font-semibold text-white">{hoveredItem.label || (hoverIndex !== null ? `Index ${hoverIndex + 1}` : "")}</span>
            <span className="text-[10px] text-zinc-500 font-mono">LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">${formatPrice(hoveredItem.price)}</span>
            <span className={`text-[11px] font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(2)} ({delta >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
