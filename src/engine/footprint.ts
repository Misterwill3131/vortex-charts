import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export interface FootprintLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  delta?: number;
}

export interface FootprintBar {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  levels: FootprintLevel[];
}

export interface DrawFootprintOptions {
  upColor?: string;
  downColor?: string;
  bidColor?: string;
  askColor?: string;
  showText?: boolean;
}

/**
 * Pure Canvas 2D renderer for Footprint (Order Flow) cluster charts.
 * Displays Bid x Ask volume executions across price rungs.
 */
export function drawFootprintChart(
  ctx: CanvasRenderingContext2D,
  bars: FootprintBar[],
  bounds: ChartBounds,
  options: DrawFootprintOptions = {}
): void {
  if (!bars || bars.length === 0) return;

  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    bidColor = "rgba(244, 63, 94, 0.4)",
    askColor = "rgba(16, 185, 129, 0.4)",
    showText = true,
  } = options;

  const count = bars.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const barWidth = Math.max(30, Math.min(100, slotWidth * 0.92));

  ctx.save();
  ctx.font = "9px Inter, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < count; i++) {
    const bar = bars[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - barWidth / 2);
    const midX = centerX;
    const isUp = bar.close >= bar.open;

    // 1. High/Low wick line
    const yHigh = Math.round(priceToY(bar.high, bounds));
    const yLow = Math.round(priceToY(bar.low, bounds));
    ctx.strokeStyle = isUp ? upColor : downColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, yHigh);
    ctx.lineTo(centerX, yLow);
    ctx.stroke();

    // 2. Cluster rows for each price level
    if (bar.levels && bar.levels.length > 0) {
      const rowHeight = Math.max(10, (yLow - yHigh) / bar.levels.length);

      for (const lvl of bar.levels) {
        const y = Math.round(priceToY(lvl.price, bounds));
        const delta = lvl.delta ?? (lvl.askVolume - lvl.bidVolume);

        // Left cell: Bid volume
        ctx.fillStyle = bidColor;
        ctx.fillRect(leftX, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);

        // Right cell: Ask volume
        ctx.fillStyle = askColor;
        ctx.fillRect(midX + 1, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);

        // Imbalance border if strong delta
        if (Math.abs(delta) > 100) {
          ctx.strokeStyle = delta > 0 ? upColor : downColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(leftX, y - rowHeight / 2, barWidth, rowHeight - 1);
        }

        // Numerical text labels if space permits
        if (showText && barWidth >= 50 && rowHeight >= 10) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(lvl.bidVolume), leftX + barWidth / 4, y);
          ctx.fillText(String(lvl.askVolume), midX + barWidth / 4, y);
        }
      }
    }
  }

  ctx.restore();
}
