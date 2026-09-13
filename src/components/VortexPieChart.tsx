import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawPieChart, type PieSlice } from "../engine/pie";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexPieChartProps {
  data: PieSlice[];
  height?: number;
  className?: string;
  donut?: boolean;
  donutHole?: number;
  borderColor?: string;
  showLabels?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexPieChart: React.FC<VortexPieChartProps> = ({
  data,
  height = 360,
  className = "",
  donut = true,
  donutHole = 0.55,
  borderColor = "#020616",
  showLabels = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const total = useMemo(() => {
    return data.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  }, [data]);

  const bounds: ChartBounds = useMemo(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);

  const effectiveHole = donut ? donutHole : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawPieChart(ctx, data, bounds, {
      donutHole: effectiveHole,
      hoverIndex,
      borderColor,
      showLabels,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, effectiveHole, hoverIndex, borderColor, showLabels, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (total <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = bounds.chartWidth / 2;
    const centerY = bounds.chartHeight / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const dist = Math.hypot(dx, dy);

    const outerRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 20;
    const innerRadius = outerRadius * effectiveHole;

    if (dist < innerRadius || dist > outerRadius) {
      setHoverIndex(null);
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += Math.PI * 2;
    }

    let currentAngle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (Math.max(0, data[i].value) / total) * (Math.PI * 2);
      if (angle >= currentAngle && angle <= currentAngle + sliceAngle) {
        setHoverIndex(i);
        return;
      }
      currentAngle += sliceAngle;
    }

    setHoverIndex(null);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredPct = hovered && total > 0 ? ((Math.max(0, hovered.value) / total) * 100).toFixed(1) : null;

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
        className="block h-full w-full cursor-pointer"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hovered && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="font-semibold text-white">{hovered.label}:</span>
          <span>Value: <strong className="text-white">${formatPrice(hovered.value)}</strong></span>
          <span className="text-sky-400 font-semibold">({hoveredPct}%)</span>
        </div>
      )}
    </div>
  );
};
