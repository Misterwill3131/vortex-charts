import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawAreaChart, type AreaDataPoint } from "../engine/area";
import { drawGenericCrosshair } from "../engine/interaction";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexAreaChartProps {
  data: AreaDataPoint[];
  height?: number;
  className?: string;
  color?: string;
  gradientTopOpacity?: number;
  gradientBottomOpacity?: number;
  lineWidth?: number;
  showLine?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexAreaChart: React.FC<VortexAreaChartProps> = ({
  data,
  height = 320,
  className = "",
  color = "#38bdf8",
  gradientTopOpacity = 0.45,
  gradientBottomOpacity = 0.02,
  lineWidth = 2.5,
  showLine = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const bounds: ChartBounds = useMemo(() => {
    const prices = data.map((d) => d.y);
    return computeBounds(prices, containerWidth, height);
  }, [data, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawAreaChart(ctx, data, bounds, {
      color: theme.colors?.spot ?? color,
      gradientTopOpacity,
      gradientBottomOpacity,
      lineWidth,
      showLine,
      smooth: true,
      glow: true,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, gradientTopOpacity, gradientBottomOpacity, lineWidth, showLine, showWatermark, theme, canvasRef]);

  // High performance 60 FPS interactive overlay crosshair & snap dot
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
      const snapY = priceToY(item.y, bounds);
      const activeColor = theme.colors?.spot ?? color;

      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: item.label || `Point ${hoverIndex + 1}`,
        yLabel: `$${formatPrice(item.y)}`,
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

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const firstVal = data[0]?.y ?? 0;
  const delta = hovered && firstVal > 0 ? hovered.y - firstVal : 0;
  const deltaPct = firstVal > 0 ? (delta / firstVal) * 100 : 0;

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
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
            top: Math.min(height - 70, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="font-semibold text-white">{hovered.label || `Day ${hoverIndex + 1}`}</span>
            <span className="text-[10px] text-zinc-500 font-mono">EQUITY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">${formatPrice(hovered.y)}</span>
            <span className={`text-[11px] font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(0)} ({delta >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
