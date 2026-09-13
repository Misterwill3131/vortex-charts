import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export interface WaterfallBar {
  label: string;
  value: number;
  isTotal?: boolean;
}

export interface DrawWaterfallOptions {
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  connectorColor?: string;
}

/**
 * Pure Canvas 2D renderer for Waterfall charts (sequential walk from baseline to total).
 */
export function drawWaterfallChart(
  ctx: CanvasRenderingContext2D,
  bars: WaterfallBar[],
  bounds: ChartBounds,
  options: DrawWaterfallOptions = {}
): void {
  if (!bars || bars.length === 0) return;

  const {
    positiveColor = "#10b981",
    negativeColor = "#f43f5e",
    totalColor = "#38bdf8",
    connectorColor = "rgba(255, 255, 255, 0.2)",
  } = options;

  const count = bars.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const barWidth = Math.max(12, Math.min(60, slotWidth * 0.65));

  ctx.save();
  ctx.font = "10px Inter, sans-serif";

  let runningTotal = 0;
  let prevY = Math.round(priceToY(0, bounds));

  for (let i = 0; i < count; i++) {
    const b = bars[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - barWidth / 2);

    let topVal: number;
    let bottomVal: number;
    let color: string;

    if (b.isTotal) {
      // Bar rests on 0 baseline
      bottomVal = 0;
      topVal = b.value;
      color = totalColor;
      runningTotal = b.value;
    } else {
      bottomVal = runningTotal;
      topVal = runningTotal + b.value;
      color = b.value >= 0 ? positiveColor : negativeColor;
      runningTotal = topVal;
    }

    const yStart = Math.round(priceToY(bottomVal, bounds));
    const yEnd = Math.round(priceToY(topVal, bounds));
    const yTop = Math.min(yStart, yEnd);
    const height = Math.max(2, Math.abs(yEnd - yStart));

    // 1. Bar Fill
    ctx.fillStyle = color;
    ctx.fillRect(leftX, yTop, barWidth, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX, yTop, barWidth, height);

    if (i > 0) {
      const prevRightX = Math.round(indexToX(i - 1, count, bounds) + barWidth / 2);
      ctx.strokeStyle = connectorColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(prevRightX, prevY);
      ctx.lineTo(leftX, prevY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    prevY = yEnd;

    // 3. Labels
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    const valueStr = b.isTotal
      ? `$${b.value.toLocaleString()}`
      : `${b.value >= 0 ? "+" : ""}$${b.value.toLocaleString()}`;
    ctx.fillText(valueStr, centerX, yTop - 6);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText(b.label, centerX, bounds.chartHeight - bounds.padding.bottom + 14);
  }

  ctx.restore();
}
