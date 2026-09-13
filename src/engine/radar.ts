import type { ChartBounds } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

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
  showValues?: boolean;
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
    showValues = true,
  } = options;

  const numAxes = dimensions.length;
  const centerX = bounds.chartWidth / 2;
  const centerY = bounds.chartHeight / 2;
  const maxRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 32;

  if (maxRadius <= 10) return;

  const angleStep = (Math.PI * 2) / numAxes;

  ctx.save();

  // 1. Draw Concentric Polygonal Grid Rings & level labels
  for (let lvl = 1; lvl <= levels; lvl++) {
    const ratio = lvl / levels;
    const r = ratio * maxRadius;
    
    ctx.strokeStyle = lvl === levels ? "rgba(255, 255, 255, 0.15)" : gridColor;
    ctx.lineWidth = lvl === levels ? 1.5 : 1;
    ctx.fillStyle = lvl % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "transparent";

    ctx.beginPath();
    for (let a = 0; a < numAxes; a++) {
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Scale tick value on North spine
    if (showValues) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "8px Inter, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${Math.round(ratio * 100)}`, centerX, centerY - r - 2);
    }
  }

  // 2. Draw Radial Axes Spines
  for (let a = 0; a < numAxes; a++) {
    const angle = a * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * maxRadius;
    const y = centerY + Math.sin(angle) * maxRadius;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Axis Label with neon accent
    const labelDist = maxRadius + 18;
    const lx = centerX + Math.cos(angle) * labelDist;
    const ly = centerY + Math.sin(angle) * labelDist;

    ctx.fillStyle = labelColor;
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.1 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(dimensions[a].name, lx, ly);
  }

  // 3. Draw Data Polygons with layered neon glow
  const defaultColors = ["#38bdf8", "#10b981", "#c084fc", "#eab308"];

  seriesList.forEach((series, sIdx) => {
    const color = series.color ?? defaultColors[sIdx % defaultColors.length];
    const fillOpacity = series.fillOpacity ?? 0.22;

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

    ctx.fillStyle = colorWithAlpha(color, fillOpacity);
    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Vertices dots with luminous concentric halos
    for (let a = 0; a < numAxes; a++) {
      const maxVal = dimensions[a].max ?? 100;
      const rawVal = series.values[a] ?? 0;
      const ratio = Math.max(0, Math.min(1, rawVal / maxVal));
      const r = ratio * maxRadius;
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      // Halo ring
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(color, 0.25);
      ctx.fill();

      // Solid core
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}
