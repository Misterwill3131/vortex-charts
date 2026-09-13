import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawLineChart, type LineSeriesPoint } from "../engine/line-chart";
import { formatPrice } from "../utils/chart-defaults";

export interface MultiLineSeries {
  name: string;
  color?: string;
  data: (LineSeriesPoint | number)[];
}

export interface VortexMultiLineChartProps {
  series: MultiLineSeries[];
  height?: number;
  className?: string;
  showPoints?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

const DEFAULT_SERIES_COLORS = [
  "#38bdf8", // Sky
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#c084fc", // Purple
  "#eab308", // Amber
  "#f97316", // Orange
];

export const VortexMultiLineChart: React.FC<VortexMultiLineChartProps> = ({
  series,
  height = 340,
  className = "",
  showPoints = false,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const normalizedSeries = useMemo(() => {
    return series.map((s, sIdx) => {
      const color = s.color || DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length];
      const points: LineSeriesPoint[] = s.data.map((pt, pIdx) => {
        if (typeof pt === "number") {
          return { price: pt, label: `Point ${pIdx + 1}` };
        }
        return pt;
      });
      return {
        name: s.name,
        color,
        points,
      };
    });
  }, [series]);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    normalizedSeries.forEach((s) => {
      s.points.forEach((p) => allPrices.push(p.price));
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [normalizedSeries, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);

    normalizedSeries.forEach((s) => {
      drawLineChart(ctx, s.points, bounds, {
        color: s.color,
        showArea: false,
        showPoints,
        glow: true,
      });
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, normalizedSeries, showPoints, showWatermark, theme, canvasRef]);

  const maxPoints = Math.max(0, ...normalizedSeries.map((s) => s.points.length));

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (maxPoints === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, maxPoints);
    const idx = Math.max(0, Math.min(maxPoints - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      {/* Top series legend */}
      <div className="absolute top-2.5 right-4 z-20 flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
        {normalizedSeries.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-zinc-300 font-mono text-[11px]">{s.name}</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hoverIndex !== null && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="text-zinc-400 font-semibold">Idx #{hoverIndex + 1}:</span>
          {normalizedSeries.map((s) => {
            const pt = s.points[hoverIndex];
            if (!pt) return null;
            return (
              <span key={s.name}>
                <span style={{ color: s.color }}>{s.name}:</span>{" "}
                <strong className="text-white">${formatPrice(pt.price)}</strong>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
