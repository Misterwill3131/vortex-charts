import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { priceToY, yToPrice } from "./coordinates";
import { formatPrice } from "../utils/chart-defaults";
import { measureTextWidth } from "./text-cache";

export interface HoverState {
  mouseX: number;
  mouseY: number;
  /** Magnetically snapped X (center of the hovered candle) — keeps the crosshair and the tooltip on the same bar */
  snapX: number;
  index: number;
  candle: Candle | null;
}

/** Vertical distance (px) under which the horizontal crosshair snaps to a candle wick */
const WICK_MAGNET_PX = 8;

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  hover: HoverState,
  timeText: string
) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;

  const { snapX, mouseY, candle } = hover;

  if (snapX < padding.left || snapX > rightAxisX || mouseY < padding.top || mouseY > bottomAxisY) {
    return;
  }

  // Wick magnetism: snap the horizontal line to High/Low when the cursor is close enough
  let crossY = mouseY;
  let snappedToWick = false;
  if (candle) {
    const yHigh = priceToY(candle.high, bounds);
    const yLow = priceToY(candle.low, bounds);
    if (Math.abs(mouseY - yHigh) <= WICK_MAGNET_PX) {
      crossY = yHigh;
      snappedToWick = true;
    } else if (Math.abs(mouseY - yLow) <= WICK_MAGNET_PX) {
      crossY = yLow;
      snappedToWick = true;
    }
  }
  const cursorPrice = yToPrice(crossY, bounds);

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;

  // 1. Vertical Line (snapped to hovered candle center)
  ctx.beginPath();
  ctx.moveTo(snapX + 0.5, padding.top);
  ctx.lineTo(snapX + 0.5, bottomAxisY);
  ctx.stroke();

  // 2. Horizontal Line (magnetized to wicks when applicable)
  ctx.beginPath();
  ctx.moveTo(padding.left, crossY + 0.5);
  ctx.lineTo(rightAxisX, crossY + 0.5);
  ctx.stroke();

  // 3. Price badge on right axis
  ctx.setLineDash([]);
  ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const priceText = `$${formatPrice(cursorPrice)}`;
  const textW = measureTextWidth(ctx, priceText);
  const pillW = textW + 10;
  const pillH = 16;
  const pillX = rightAxisX + 4;
  const pillY = Math.round(crossY - pillH / 2);

  // Cyan when tracking the cursor, emerald when snapped to a wick
  ctx.fillStyle = snappedToWick ? "#10b981" : "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 3);
  ctx.fill();

  ctx.fillStyle = "#020616";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceText, pillX + pillW / 2, pillY + pillH / 2);

  // 4. Time badge on bottom axis (centered on the snapped candle)
  if (timeText) {
    ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const timeW = measureTextWidth(ctx, timeText) + 12;
    const timeH = 16;
    const timeX = Math.round(snapX - timeW / 2);
    const timeY = bottomAxisY + 4;

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(timeX, timeY, timeW, timeH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f1f5f9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(timeText, timeX + timeW / 2, timeY + timeH / 2);
  }

  ctx.restore();
}

/**
 * Ghost vertical crosshair drawn when a remote chart in the same sync group
 * is hovered. Subtle cyan dashed line — no badges, no tooltip interference.
 */
export function drawRemoteCrosshair(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  x: number
) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;

  if (x < padding.left || x > rightAxisX) return;

  ctx.save();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, padding.top);
  ctx.lineTo(Math.round(x) + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Formats a raw volume count into readable shorthand (e.g. 1.45M, 240K).
 */
export function formatVolume(volume?: number): string {
  if (volume === undefined || volume === null || isNaN(volume) || volume <= 0) return "-";
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toLocaleString();
}

/**
 * Computes price difference and percentage with formatted sign.
 */
export function formatChange(open: number, close: number) {
  const diff = close - open;
  const pct = open > 0 ? (diff / open) * 100 : 0;
  const isBullish = diff >= 0;
  const sign = isBullish ? "+" : "";
  return {
    diff,
    pct,
    isBullish,
    text: `${sign}$${formatPrice(diff)} (${sign}${pct.toFixed(2)}%)`,
  };
}
