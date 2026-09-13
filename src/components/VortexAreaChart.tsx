import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawAreaChart, type AreaDataPoint } from "../engine/area";
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
  lineWidth = 2,
  showLine = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, gradientTopOpacity, gradientBottomOpacity, lineWidth, showLine, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
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
        onPointerLeave={() => setHoverIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          {hovered.label && <span className="font-semibold text-white">{hovered.label}</span>}
          <span>Value: <strong className="text-sky-400">${formatPrice(hovered.y)}</strong></span>
        </div>
      )}
    </div>
  );
};
