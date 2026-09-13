import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawChoropleth, type GeoRegion } from "../engine/choropleth";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexChoroplethMapProps {
  regions: GeoRegion[];
  height?: number;
  className?: string;
  borderColor?: string;
  showLabels?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexChoroplethMap: React.FC<VortexChoroplethMapProps> = ({
  regions,
  height = 380,
  className = "",
  borderColor = "rgba(255, 255, 255, 0.25)",
  showLabels = true,
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredRegion, setHoveredRegion] = useState<GeoRegion | null>(null);

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

    drawChoropleth(ctx, regions, bounds, {
      borderColor,
      showLabels,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, regions, borderColor, showLabels, showWatermark, theme, canvasRef]);

  // Point-in-polygon hit test for hover
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!regions || regions.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let hit: GeoRegion | null = null;

    for (const region of regions) {
      for (const poly of region.polygons) {
        let inside = false;
        const pts = poly.points;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = bounds.padding.left + pts[i][0] * bounds.plotWidth;
          const yi = bounds.padding.top + pts[i][1] * bounds.plotHeight;
          const xj = bounds.padding.left + pts[j][0] * bounds.plotWidth;
          const yj = bounds.padding.top + pts[j][1] * bounds.plotHeight;

          const intersect = yi > mouseY !== yj > mouseY && mouseX < ((xj - xi) * (mouseY - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        if (inside) {
          hit = region;
          break;
        }
      }
      if (hit) break;
    }

    setHoveredRegion(hit);
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
        onPointerLeave={() => setHoveredRegion(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hoveredRegion && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span className="font-semibold text-white">{hoveredRegion.name}</span>
          <span>Value: <strong className="text-sky-400">${formatPrice(hoveredRegion.value)}</strong></span>
        </div>
      )}
    </div>
  );
};
