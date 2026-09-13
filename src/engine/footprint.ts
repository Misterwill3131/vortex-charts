import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

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
    bidColor = "#f43f5e",
    askColor = "#10b981",
    showText = true,
  } = options;

  const count = bars.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const barWidth = Math.max(36, Math.min(110, slotWidth * 0.92));

  // Find overall max volume across all rungs for relative heatmap intensity
  let maxRungVol = 1;
  for (const b of bars) {
    if (b.levels) {
      for (const lvl of b.levels) {
        if (lvl.bidVolume > maxRungVol) maxRungVol = lvl.bidVolume;
        if (lvl.askVolume > maxRungVol) maxRungVol = lvl.askVolume;
      }
    }
  }

  ctx.save();
  ctx.font = "bold 9px Inter, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < count; i++) {
    const bar = bars[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - barWidth / 2);
    const midX = centerX;
    const isUp = bar.close >= bar.open;

    // 1. High/Low spine line with glow
    const yHigh = Math.round(priceToY(bar.high, bounds));
    const yLow = Math.round(priceToY(bar.low, bounds));
    ctx.strokeStyle = isUp ? upColor : downColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, yHigh);
    ctx.lineTo(centerX, yLow);
    ctx.stroke();

    // 2. Cluster rows for each price level
    if (bar.levels && bar.levels.length > 0) {
      const rowHeight = Math.max(12, (yLow - yHigh) / bar.levels.length);

      // Find POC (Point of Control) for this candle
      let barPocIdx = 0;
      let barMaxVol = 0;
      for (let l = 0; l < bar.levels.length; l++) {
        const lvl = bar.levels[l];
        const lvlTot = lvl.bidVolume + lvl.askVolume;
        if (lvlTot > barMaxVol) {
          barMaxVol = lvlTot;
          barPocIdx = l;
        }
      }

      let barTotalDelta = 0;

      for (let l = 0; l < bar.levels.length; l++) {
        const lvl = bar.levels[l];
        const y = Math.round(priceToY(lvl.price, bounds));
        const delta = lvl.delta ?? (lvl.askVolume - lvl.bidVolume);
        barTotalDelta += delta;
        const isPoc = l === barPocIdx;

        const bidOpacity = 0.12 + Math.min(0.7, (lvl.bidVolume / maxRungVol) * 0.7);
        const askOpacity = 0.12 + Math.min(0.7, (lvl.askVolume / maxRungVol) * 0.7);

        // Left cell: Bid volume
        ctx.fillStyle = colorWithAlpha(bidColor, bidOpacity);
        ctx.fillRect(leftX, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);

        // Right cell: Ask volume
        ctx.fillStyle = colorWithAlpha(askColor, askOpacity);
        ctx.fillRect(midX + 1, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);

        // POC rung highlight border
        if (isPoc) {
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(leftX, y - rowHeight / 2, barWidth, rowHeight - 1);
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          ctx.strokeRect(leftX, y - rowHeight / 2, barWidth, rowHeight - 1);
        }

        // Numerical text labels if space permits
        if (showText && barWidth >= 44 && rowHeight >= 11) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(lvl.bidVolume), leftX + barWidth / 4, y);
          ctx.fillText(String(lvl.askVolume), midX + barWidth / 4, y);
        }
      }

      // Bar Delta badge at bottom of candle
      ctx.font = "bold 8px Inter, monospace";
      ctx.fillStyle = barTotalDelta >= 0 ? "#10b981" : "#f43f5e";
      const deltaStr = `Δ ${barTotalDelta >= 0 ? "+" : ""}${barTotalDelta}`;
      ctx.fillText(deltaStr, centerX, yLow + 10);
      ctx.font = "bold 9px Inter, monospace";
    }
  }

  ctx.restore();
}
