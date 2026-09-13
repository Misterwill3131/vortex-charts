import type { ChartBounds } from "./coordinates";

export interface GeoPolygon {
  points: [number, number][]; // Normalized coords 0..1 or [lon, lat]
}

export interface GeoRegion {
  id: string;
  name: string;
  value: number;
  polygons: GeoPolygon[];
}

export interface DrawChoroplethOptions {
  colorScale?: (ratio: number) => string;
  defaultColor?: string;
  borderColor?: string;
  showLabels?: boolean;
}

/**
 * Pure Canvas 2D renderer for thematic Choropleth Maps.
 */
export function drawChoropleth(
  ctx: CanvasRenderingContext2D,
  regions: GeoRegion[],
  bounds: ChartBounds,
  options: DrawChoroplethOptions = {}
): void {
  if (!regions || regions.length === 0) return;

  const defaultColorScale = (r: number) => {
    // Dark Cyan to Bright Neon Cyan
    const alpha = 0.2 + Math.max(0, Math.min(1, r)) * 0.75;
    return `rgba(56, 189, 248, ${alpha})`;
  };

  const {
    colorScale = defaultColorScale,
    borderColor = "rgba(255, 255, 255, 0.25)",
    showLabels = true,
  } = options;

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const r of regions) {
    if (r.value < minVal) minVal = r.value;
    if (r.value > maxVal) maxVal = r.value;
  }

  const range = Math.max(maxVal - minVal, 0.0001);

  ctx.save();
  ctx.lineWidth = 1;

  for (const region of regions) {
    const ratio = (region.value - minVal) / range;
    const fillColor = colorScale(ratio);

    for (const poly of region.polygons) {
      if (!poly.points || poly.points.length < 3) continue;

      ctx.beginPath();
      for (let i = 0; i < poly.points.length; i++) {
        const [nx, ny] = poly.points[i];
        const screenX = bounds.padding.left + nx * bounds.plotWidth;
        const screenY = bounds.padding.top + ny * bounds.plotHeight;

        if (i === 0) ctx.moveTo(screenX, screenY);
        else ctx.lineTo(screenX, screenY);
      }
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.stroke();
    }

    // Label at centroid
    if (showLabels && region.polygons.length > 0 && region.polygons[0].points.length > 0) {
      const pts = region.polygons[0].points;
      let sumX = 0, sumY = 0;
      for (const p of pts) {
        sumX += p[0];
        sumY += p[1];
      }
      const cx = bounds.padding.left + (sumX / pts.length) * bounds.plotWidth;
      const cy = bounds.padding.top + (sumY / pts.length) * bounds.plotHeight;

      ctx.fillStyle = "#ffffff";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(region.name, cx, cy);
    }
  }

  ctx.restore();
}
