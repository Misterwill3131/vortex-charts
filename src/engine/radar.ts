import type { ChartBounds } from "./coordinates";

export interface RadarDimension {
  name: string;
  max?: number;
}

export interface RadarSeries {
  name: string;
  values: number[]; // Matches dimensions array order
  color?: string;
  fillOpacity?: number;
}

export interface DrawRadarOptions {
  levels?: number; // Number of concentric rings
  gridColor?: string;
  labelColor?: string;
}

/**
 * Pure Canvas 2D renderer for Radar / Spider charts (multidimensional profile comparison).
 */
export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  dimensions: RadarDimension[],
  seriesList: RadarSeries[],
  bounds: ChartBounds,
  options: DrawRadarOptions = {}
): void {
  if (!dimensions || dimensions.length < 3 || !seriesList || seriesList.length === 0) return;

  const {
    levels = 4,
    gridColor = "rgba(255, 255, 255, 0.08)",
    labelColor = "#94a3b8",
  } = options;

  const numAxes = dimensions.length;
  const centerX = bounds.chartWidth / 2;
  const centerY = bounds.chartHeight / 2;
  const maxRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 30;

  if (maxRadius <= 10) return;

  const angleStep = (Math.PI * 2) / numAxes;

  ctx.save();

  // 1. Draw Concentric Polygonal Grid Rings
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (lvl / levels) * maxRadius;
    ctx.beginPath();
    for (let a = 0; a < numAxes; a++) {
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 2. Draw Radial Axes Spines
  for (let a = 0; a < numAxes; a++) {
    const angle = a * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * maxRadius;
    const y = centerY + Math.sin(angle) * maxRadius;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Axis Label
    const labelDist = maxRadius + 16;
    const lx = centerX + Math.cos(angle) * labelDist;
    const ly = centerY + Math.sin(angle) * labelDist;

    ctx.fillStyle = labelColor;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.1 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(dimensions[a].name, lx, ly);
  }

  // 3. Draw Data Polygons
  const defaultColors = ["#38bdf8", "#10b981", "#c084fc", "#eab308"];

  seriesList.forEach((series, sIdx) => {
    const color = series.color ?? defaultColors[sIdx % defaultColors.length];
    const fillOpacity = series.fillOpacity ?? 0.25;

    ctx.beginPath();
    for (let a = 0; a < numAxes; a++) {
      const maxVal = dimensions[a].max ?? 100;
      const rawVal = series.values[a] ?? 0;
      const ratio = Math.max(0, Math.min(1, rawVal / maxVal));
      const r = ratio * maxRadius;
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.fillStyle = color.replace(")", `, ${fillOpacity})`).replace("rgb", "rgba");
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vertices dots
    for (let a = 0; a < numAxes; a++) {
      const maxVal = dimensions[a].max ?? 100;
      const rawVal = series.values[a] ?? 0;
      const ratio = Math.max(0, Math.min(1, rawVal / maxVal));
      const r = ratio * maxRadius;
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });

  ctx.restore();
}
