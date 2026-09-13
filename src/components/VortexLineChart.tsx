import React, { useEffect, useMemo, useState } from "react";
import { VORTEX_THEME, type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawLineChart, type LineSeriesPoint } from "../engine/line-chart";
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

  const bounds: ChartBounds = useMemo(() => {
    const prices = data.map((d) => d.price);
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
    drawLineChart(ctx, data, bounds, {
      color: theme.colors?.spot ?? color,
      showArea,
      showPoints,
      glow: true,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, showArea, showPoints, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

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

      {hoveredItem && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          {hoveredItem.label && <span className="font-semibold text-white">{hoveredItem.label}</span>}
          <span>Price: <strong className="text-sky-400">${formatPrice(hoveredItem.price)}</strong></span>
        </div>
      )}
    </div>
  );
};
