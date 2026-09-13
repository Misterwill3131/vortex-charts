import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

export interface BoxPlotItem {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export interface DrawBoxPlotOptions {
  boxColor?: string;
  medianColor?: string;
  whiskerColor?: string;
  outlierColor?: string;
}

/**
 * Computes 5-number statistical summary (Min, Q1, Median, Q3, Max) and outliers.
 */
export function computeBoxPlotStats(rawValues: number[], label: string = ""): BoxPlotItem {
  if (!rawValues || rawValues.length === 0) {
    return { label, min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
  }

  const sorted = [...rawValues].sort((a, b) => a - b);
  const n = sorted.length;

  function quantile(q: number): number {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
  const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[n - 1];

  return {
    label,
    min,
    q1,
    median,
    q3,
    max,
    outliers,
  };
}

/**
 * Pure Canvas 2D renderer for statistical Box-and-Whisker Plots.
 */
export function drawBoxPlot(
  ctx: CanvasRenderingContext2D,
  data: BoxPlotItem[],
  bounds: ChartBounds,
  options: DrawBoxPlotOptions = {}
): void {
  if (!data || data.length === 0) return;

  const {
    boxColor = "#38bdf8",
    medianColor = "#eab308",
    whiskerColor = "#94a3b8",
    outlierColor = "#f43f5e",
  } = options;

  const count = data.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const boxWidth = Math.max(14, Math.min(64, slotWidth * 0.55));
  const whiskerCapWidth = boxWidth * 0.55;

  ctx.save();

  for (let i = 0; i < count; i++) {
    const item = data[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - boxWidth / 2);

    const yMin = Math.round(priceToY(item.min, bounds));
    const yQ1 = Math.round(priceToY(item.q1, bounds));
    const yMedian = Math.round(priceToY(item.median, bounds));
    const yQ3 = Math.round(priceToY(item.q3, bounds));
    const yMax = Math.round(priceToY(item.max, bounds));

    // 1. Whiskers (vertical stem & horizontal caps)
    ctx.strokeStyle = whiskerColor;
    ctx.lineWidth = 1.5;

    // Lower whisker: Min to Q1
    ctx.beginPath();
    ctx.moveTo(centerX, yQ1);
    ctx.lineTo(centerX, yMin);
    ctx.moveTo(centerX - whiskerCapWidth / 2, yMin);
    ctx.lineTo(centerX + whiskerCapWidth / 2, yMin);
    ctx.stroke();

    // Upper whisker: Q3 to Max
    ctx.beginPath();
    ctx.moveTo(centerX, yQ3);
    ctx.lineTo(centerX, yMax);
    ctx.moveTo(centerX - whiskerCapWidth / 2, yMax);
    ctx.lineTo(centerX + whiskerCapWidth / 2, yMax);
    ctx.stroke();

    // 2. Interquartile Range (IQR) Box with frosted glass gradient
    const boxHeight = Math.max(2, yQ1 - yQ3);
    if (typeof ctx.createLinearGradient === "function") {
      const boxGradient = ctx.createLinearGradient(0, yQ3, 0, yQ1);
      boxGradient.addColorStop(0, colorWithAlpha(boxColor, 0.35));
      boxGradient.addColorStop(1, colorWithAlpha(boxColor, 0.15));
      ctx.fillStyle = boxGradient;
    } else {
      ctx.fillStyle = colorWithAlpha(boxColor, 0.25);
    }
    ctx.fillRect(leftX, yQ3, boxWidth, boxHeight);

    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 1.5;
    if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(leftX, yQ3, boxWidth, boxHeight);
    }

    // 3. Median Line with glow
    ctx.shadowColor = medianColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = medianColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftX, yMedian);
    ctx.lineTo(leftX + boxWidth, yMedian);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Outliers (luminous dots)
    if (item.outliers && item.outliers.length > 0) {
      for (const out of item.outliers) {
        const yOut = Math.round(priceToY(out, bounds));
        
        ctx.beginPath();
        ctx.arc(centerX, yOut, 6, 0, Math.PI * 2);
        ctx.fillStyle = colorWithAlpha(outlierColor, 0.25);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, yOut, 3, 0, Math.PI * 2);
        ctx.fillStyle = outlierColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 5. Category label
    if (item.label) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.label, centerX, bounds.chartHeight - bounds.padding.bottom + 14);
    }
  }

  ctx.restore();
}
