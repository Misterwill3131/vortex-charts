import type { ChartBounds, ViewportPadding } from "./coordinates";
import { priceToY } from "./coordinates";
import { colorWithAlpha } from "../utils/color";

export interface WhaleBiasPoint {
  scannedAt: number;
  callPct: number; // 0 to 100
}

export interface DrawBiasOptions {
  bullishColor?: string;
  bearishColor?: string;
  equilibriumValue?: number;
  lineWidth?: number;
  showEquilibrium?: boolean;
  showBeacon?: boolean;
  showGrid?: boolean;
  baselinePoints?: WhaleBiasPoint[];
}

export const DEFAULT_BIAS_PADDING: ViewportPadding = {
  top: 14,
  bottom: 22,
  left: 38,
  right: 18,
};

/**
 * Computes standard 0-100% chart bounds tailored for bias / ratio indicators.
 */
export function computeBiasBounds(
  width: number,
  height: number,
  padding: ViewportPadding = DEFAULT_BIAS_PADDING
): ChartBounds {
  const minPrice = 0;
  const maxPrice = 100;
  const priceRange = 100;
  const plotWidth = Math.max(width - padding.left - padding.right, 10);
  const plotHeight = Math.max(height - padding.top - padding.bottom, 10);

  return {
    minPrice,
    maxPrice,
    priceRange,
    chartWidth: width,
    chartHeight: height,
    plotWidth,
    plotHeight,
    padding,
  };
}

/**
 * Maps chronological points to pixel coordinates within bounds.
 */
export function getBiasPointCoords(
  points: WhaleBiasPoint[],
  bounds: ChartBounds
): { x: number; y: number; point: WhaleBiasPoint }[] {
  if (points.length === 0) return [];
  const t0 = points[0].scannedAt;
  const t1 = points[points.length - 1].scannedAt || t0 + 1;
  const span = Math.max(1, t1 - t0);

  return points.map((p) => {
    const frac = (p.scannedAt - t0) / span;
    const x = bounds.padding.left + frac * bounds.plotWidth;
    const y = priceToY(Math.max(0, Math.min(100, p.callPct)), bounds);
    return { x, y, point: p };
  });
}

/**
 * Traces a smooth Catmull-Rom to Cubic Bezier spline path through points.
 */
export function traceBiasSpline(ctx: CanvasRenderingContext2D, coords: { x: number; y: number }[]): void {
  if (coords.length < 2) return;
  if (coords.length === 2) {
    ctx.moveTo(coords[0].x, coords[0].y);
    ctx.lineTo(coords[1].x, coords[1].y);
    return;
  }

  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

/**
 * Formats timestamps in HH:MM AM/PM format.
 */
export function formatBiasTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Pure Canvas 2D renderer for Whale Flow Bias Chart.
 */
export function drawWhaleBiasChart(
  ctx: CanvasRenderingContext2D,
  points: WhaleBiasPoint[],
  bounds: ChartBounds,
  options: DrawBiasOptions = {}
): void {
  if (!points || points.length < 2) return;

  const {
    bullishColor = "#10b981",
    bearishColor = "#f43f5e",
    equilibriumValue = 50,
    lineWidth = 2.5,
    showEquilibrium = true,
    showBeacon = true,
    showGrid = true,
    baselinePoints,
  } = options;

  const { padding, plotWidth, plotHeight, chartWidth, chartHeight } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const yEq = priceToY(equilibriumValue, bounds);

  const coords = getBiasPointCoords(points, bounds);
  if (coords.length < 2) return;

  ctx.save();

  // 1. Gridlines & Axis labels
  if (showGrid) {
    const gridLevels = [0, 25, 50, 75, 100];
    gridLevels.forEach((lvl) => {
      const y = priceToY(lvl, bounds);
      const isEq = lvl === equilibriumValue;

      ctx.beginPath();
      ctx.strokeStyle = isEq ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = isEq ? 1.5 : 1;
      if (isEq) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(padding.left, y);
      ctx.lineTo(rightAxisX, y);
      ctx.stroke();

      // Y-axis label on the left (0%, 50%, 100%)
      if (lvl === 0 || lvl === 50 || lvl === 100) {
        ctx.font = "bold 9px Inter, -apple-system, sans-serif";
        ctx.fillStyle = "#71717a";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${lvl}%`, padding.left - 6, y);
      }
    });

    ctx.setLineDash([]);

    // 50% EQUILIBRIUM text badge on the right
    if (showEquilibrium) {
      ctx.font = "bold 8px Inter, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${equilibriumValue}% EQUILIBRIUM`, rightAxisX, yEq - 4);
    }

    // X-axis time labels
    const t0 = points[0].scannedAt;
    const t1 = points[points.length - 1].scannedAt;
    const tMid = t0 + (t1 - t0) / 2;

    ctx.font = "500 9px Inter, -apple-system, sans-serif";
    ctx.fillStyle = "#71717a";
    ctx.textBaseline = "top";

    ctx.textAlign = "left";
    ctx.fillText(formatBiasTime(t0), padding.left, bottomAxisY + 6);

    ctx.textAlign = "center";
    ctx.fillText(formatBiasTime(tMid), padding.left + plotWidth / 2, bottomAxisY + 6);

    ctx.textAlign = "right";
    ctx.fillText(formatBiasTime(t1), rightAxisX, bottomAxisY + 6);
  }

  const first = coords[0];
  const last = coords[coords.length - 1];

  // 1b. Secondary Baseline Curve (e.g. 1D cumulative anchor)
  if (baselinePoints && baselinePoints.length >= 2) {
    const baseCoords = getBiasPointCoords(baselinePoints, bounds);
    if (baseCoords.length >= 2) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)"; // subtle dashed slate
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      traceBiasSpline(ctx, baseCoords);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Dual Split Gradient Fills
  // ── A. Upper Area (Bullish, above 50%) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left, padding.top, plotWidth, Math.max(0, yEq - padding.top));
  ctx.clip();

  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.lineTo(last.x, yEq);
  ctx.lineTo(first.x, yEq);
  ctx.closePath();

  const gradUpper = ctx.createLinearGradient(0, padding.top, 0, yEq);
  gradUpper.addColorStop(0, colorWithAlpha(bullishColor, 0.22));
  gradUpper.addColorStop(1, colorWithAlpha(bullishColor, 0.02));
  ctx.fillStyle = gradUpper;
  ctx.fill();
  ctx.restore();

  // ── B. Lower Area (Bearish, below 50%) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left, yEq, plotWidth, Math.max(0, bottomAxisY - yEq));
  ctx.clip();

  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.lineTo(last.x, yEq);
  ctx.lineTo(first.x, yEq);
  ctx.closePath();

  const gradLower = ctx.createLinearGradient(0, yEq, 0, bottomAxisY);
  gradLower.addColorStop(0, colorWithAlpha(bearishColor, 0.02));
  gradLower.addColorStop(1, colorWithAlpha(bearishColor, 0.22));
  ctx.fillStyle = gradLower;
  ctx.fill();
  ctx.restore();

  // 3. Glowing Neon Spline Curves
  // ── A. Bullish Curve (Above 50%) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left - 4, padding.top - 4, plotWidth + 8, Math.max(0, yEq - padding.top + 4));
  ctx.clip();

  ctx.shadowColor = colorWithAlpha(bullishColor, 0.65);
  ctx.shadowBlur = 7;
  ctx.strokeStyle = bullishColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.stroke();
  ctx.restore();

  // ── B. Bearish Curve (Below 50%) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left - 4, yEq, plotWidth + 8, Math.max(0, bottomAxisY - yEq + 4));
  ctx.clip();

  ctx.shadowColor = colorWithAlpha(bearishColor, 0.65);
  ctx.shadowBlur = 7;
  ctx.strokeStyle = bearishColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.stroke();
  ctx.restore();

  // 4. Pulsing Live Beacon on Last Point
  if (showBeacon && coords.length > 0) {
    const isBull = last.point.callPct >= equilibriumValue;
    const beaconColor = isBull ? bullishColor : bearishColor;

    ctx.save();
    // Glowing halo ring
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(beaconColor, 0.25);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(beaconColor, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Solid core dot
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
