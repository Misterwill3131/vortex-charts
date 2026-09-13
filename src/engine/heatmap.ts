import type { ChartBounds } from "./coordinates";

export interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  values: number[][]; // [yRow][xCol]
  minValue?: number;
  maxValue?: number;
}

export interface DrawHeatmapOptions {
  colorScale?: "vortex" | "coolwarm" | "emerald";
  showValues?: boolean;
  cellPadding?: number;
  borderRadius?: number;
  hoveredCell?: { row: number; col: number } | null;
}

/**
 * Returns [r, g, b, a] for given normalized ratio
 */
function getRgba(ratio: number, scale: "vortex" | "coolwarm" | "emerald"): [number, number, number, number] {
  const r = Math.max(0, Math.min(1, ratio));

  if (scale === "coolwarm") {
    const red = Math.round(244 * (1 - r) + 56 * r);
    const green = Math.round(63 * (1 - r) + 189 * r);
    const blue = Math.round(94 * (1 - r) + 248 * r);
    return [red, green, blue, 0.85];
  }

  if (scale === "emerald") {
    const alpha = 0.15 + r * 0.85;
    return [16, 185, 129, alpha];
  }

  // Default "vortex": Obsidian Dark -> Cyan -> Electric Emerald
  if (r < 0.5) {
    const t = r * 2;
    const red = Math.round(15 * (1 - t) + 56 * t);
    const green = Math.round(23 * (1 - t) + 189 * t);
    const blue = Math.round(42 * (1 - t) + 248 * t);
    return [red, green, blue, 0.25 + t * 0.65];
  } else {
    const t = (r - 0.5) * 2;
    const red = Math.round(56 * (1 - t) + 16 * t);
    const green = Math.round(189 * (1 - t) + 185 * t);
    const blue = Math.round(248 * (1 - t) + 129 * t);
    return [red, green, blue, 0.85 + t * 0.15];
  }
}

/**
 * Pure Canvas 2D renderer for 2D Matrix Heatmaps (correlation, activity, volatility).
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  data: HeatmapData,
  bounds: ChartBounds,
  options: DrawHeatmapOptions = {}
): void {
  const { xLabels, yLabels, values } = data;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) return;

  const {
    colorScale = "vortex",
    showValues = true,
    cellPadding = 2.5,
    borderRadius = 4,
    hoveredCell = null,
  } = options;

  const numRows = yLabels.length;
  const numCols = xLabels.length;

  let min = data.minValue ?? Infinity;
  let max = data.maxValue ?? -Infinity;

  if (data.minValue === undefined || data.maxValue === undefined) {
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const val = values[r]?.[c] ?? 0;
        if (data.minValue === undefined && val < min) min = val;
        if (data.maxValue === undefined && val > max) max = val;
      }
    }
  }

  const range = Math.max(max - min, 0.0001);

  const cellWidth = bounds.plotWidth / numCols;
  const cellHeight = bounds.plotHeight / numRows;

  ctx.save();
  ctx.font = "bold 10px Inter, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 1. Draw Cells
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const val = values[r]?.[c] ?? 0;
      const norm = (val - min) / range;
      const [cr, cg, cb, ca] = getRgba(norm, colorScale);

      const x = bounds.padding.left + c * cellWidth + cellPadding;
      const y = bounds.padding.top + r * cellHeight + cellPadding;
      const w = Math.max(1, cellWidth - cellPadding * 2);
      const h = Math.max(1, cellHeight - cellPadding * 2);

      const isHovered = hoveredCell && hoveredCell.row === r && hoveredCell.col === c;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, borderRadius);
      } else {
        ctx.rect(x, y, w, h);
      }

      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Perceptual luminance calculation for high-contrast typography
      if (showValues && w >= 22 && h >= 14) {
        const luminance = (0.299 * cr + 0.587 * cg + 0.114 * cb) * ca;
        ctx.fillStyle = luminance > 125 ? "#020616" : "#ffffff";
        ctx.fillText(val.toFixed(2), x + w / 2, y + h / 2);
      }
    }
  }

  // 2. Draw Column (X) and Row (Y) labels
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px Inter, sans-serif";

  // X labels at bottom
  for (let c = 0; c < numCols; c++) {
    const x = bounds.padding.left + c * cellWidth + cellWidth / 2;
    const y = bounds.chartHeight - bounds.padding.bottom + 14;
    ctx.fillText(xLabels[c] ?? "", x, y);
  }

  // Y labels at right axis
  ctx.textAlign = "left";
  for (let r = 0; r < numRows; r++) {
    const x = bounds.chartWidth - bounds.padding.right + 6;
    const y = bounds.padding.top + r * cellHeight + cellHeight / 2;
    ctx.fillText(yLabels[r] ?? "", x, y);
  }

  ctx.restore();
}
