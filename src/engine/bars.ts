import type { ChartBounds } from "./coordinates";
import { DEFAULT_PADDING } from "./coordinates";
import { indexToX } from "./coordinates";
import { measureTextWidth } from "./text-cache";

export interface BarDatum {
  /** Numeric X used to anchor vertical reference lines (e.g. strike) */
  x: number;
  /** Bottom axis label — set to "" to hide an individual label */
  label: string;
  /** Primary bar value */
  value: number;
  /** Optional grouped second bar (rendered side by side) */
  value2?: number;
  /** Optional line-overlay value (e.g. net curve) */
  overlay?: number;
}

export interface BarReferenceLine {
  /** Numeric X matched against the nearest datum.x */
  value: number;
  label: string;
  color: string;
}

export interface BarChartOptions {
  posColor: string;
  negColor: string;
  posGlow: string;
  negGlow: string;
  /** Fixed color for the primary bars (overrides sign-based coloring) */
  valueColor?: string;
  /** Fixed color for the grouped second bars */
  value2Color?: string;
  overlayColor: string;
  formatValue: (n: number) => string;
  tickCount: number;
  referenceLines: BarReferenceLine[];
}

/**
 * Builds chart bounds for a bar chart. Unlike computeBounds, this supports
 * negative values: the domain is either symmetric around zero (default) or
 * clamped to include zero on the min/max side.
 */
export function computeBarBounds(
  data: BarDatum[],
  width: number,
  height: number,
  symmetric: boolean,
  padding = DEFAULT_PADDING
): ChartBounds {
  let maxAbs = 0;
  let min = 0;
  let max = 0;
  for (const d of data) {
    for (const v of [d.value, d.value2, d.overlay]) {
      if (typeof v !== "number" || !isFinite(v)) continue;
      const a = Math.abs(v);
      if (a > maxAbs) maxAbs = a;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  maxAbs = maxAbs > 0 ? maxAbs * 1.08 : 1;

  const minPrice = symmetric ? -maxAbs : min < 0 ? min * 1.08 : 0;
  const maxPrice = symmetric ? maxAbs : max > 0 ? max * 1.08 : 0;
  const span = maxPrice - minPrice || 1;

  return {
    minPrice,
    maxPrice,
    priceRange: span,
    chartWidth: width,
    chartHeight: height,
    plotWidth: Math.max(width - padding.left - padding.right, 10),
    plotHeight: Math.max(height - padding.top - padding.bottom, 10),
    padding,
  };
}

/**
 * Thins bottom labels so they never overlap: keeps at most
 * floor(plotWidth / minGapPx) evenly spaced labels (first + last preserved).
 */
export function thinLabels(
  count: number,
  plotWidth: number,
  minGapPx = 56
): boolean[] {
  const visible: boolean[] = new Array(count).fill(false);
  if (count === 0) return visible;
  const maxLabels = Math.max(1, Math.floor(plotWidth / minGapPx));
  if (count <= maxLabels) {
    return visible.fill(true);
  }
  // Preserve first and last, space the rest evenly
  const step = (count - 1) / (maxLabels - 1);
  for (let i = 0; i < maxLabels; i++) {
    visible[Math.round(i * step)] = true;
  }
  return visible;
}

/**
 * Maps a reference-line value to the nearest datum index (binary-free scan:
 * reference lines are few, data can be large but x is sorted in practice).
 */
export function nearestDatumIndex(data: BarDatum[], value: number): number {
  if (data.length === 0) return -1;
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(data[i].x - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

export function drawBarChart(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  data: BarDatum[],
  options: BarChartOptions
) {
  if (data.length === 0) return;

  const { chartWidth, chartHeight, plotWidth, plotHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const yZero = padding.top + plotHeight * (bounds.maxPrice / bounds.priceRange);
  const count = data.length;
  const slotWidth = plotWidth / count;
  const yOf = (value: number): number =>
    padding.top + plotHeight * (1 - (value - bounds.minPrice) / bounds.priceRange);

  ctx.save();

  // ── 1. Axes: horizontal value gridlines + right labels ──────────────
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillStyle = "#71717a";
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const step = bounds.priceRange / (options.tickCount + 1);
  for (let i = 1; i <= options.tickCount; i++) {
    const value = bounds.minPrice + i * step;
    if (Math.abs(value) < step * 0.01) continue; // zero line drawn separately
    const y = Math.round(yOf(value));
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();
    ctx.fillText(options.formatValue(value), rightAxisX + 8, y);
  }

  // ── 2. Zero baseline ────────────────────────────────────────────────
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, yZero + 0.5);
  ctx.lineTo(rightAxisX, yZero + 0.5);
  ctx.stroke();

  // ── 3. Border separators ────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.moveTo(rightAxisX + 0.5, padding.top);
  ctx.lineTo(rightAxisX + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, bottomAxisY + 0.5);
  ctx.lineTo(chartWidth, bottomAxisY + 0.5);
  ctx.stroke();

  // ── 4. Bars (single sign-based or grouped fixed-color) ──────────────
  const grouped = data.some((d) => typeof d.value2 === "number");
  const barCount = grouped ? 2 : 1;
  const barWidth = Math.max(2, Math.min(slotWidth * 0.72 / barCount, 28));
  const groupWidth = barCount === 1 ? barWidth : barWidth * 2 + 2;

  const gradPos = ctx.createLinearGradient(0, padding.top, 0, yZero);
  gradPos.addColorStop(0, options.posGlow);
  gradPos.addColorStop(1, hexToRgba(options.posColor, 0.25));
  const gradNeg = ctx.createLinearGradient(0, yZero, 0, bottomAxisY);
  gradNeg.addColorStop(0, options.negGlow);
  gradNeg.addColorStop(1, hexToRgba(options.negColor, 0.25));

  data.forEach((d, i) => {
    const cx = indexToX(i, count, bounds);

    // Primary bar
    const v1 = typeof d.value === "number" && isFinite(d.value) ? d.value : 0;
    const y1 = yOf(v1);
    const h1 = Math.abs(yZero - y1);
    ctx.fillStyle = options.valueColor ?? (v1 >= 0 ? gradPos : gradNeg);
    ctx.fillRect(Math.round(cx - groupWidth / 2), Math.min(y1, yZero), barWidth, Math.max(1, h1));

    // Grouped second bar
    if (grouped) {
      const v2 = typeof d.value2 === "number" && isFinite(d.value2) ? d.value2 : 0;
      const y2 = yOf(v2);
      const h2 = Math.abs(yZero - y2);
      ctx.fillStyle = options.value2Color ?? options.negColor;
      ctx.fillRect(Math.round(cx - groupWidth / 2 + barWidth + 2), Math.min(y2, yZero), barWidth, Math.max(1, h2));
    }
  });

  // ── 5. Line overlay (net curve) ─────────────────────────────────────
  const overlayPoints: { x: number; price: number }[] = [];
  for (let i = 0; i < count; i++) {
    const overlay = data[i].overlay;
    if (typeof overlay === "number" && isFinite(overlay)) {
      overlayPoints.push({ x: indexToX(i, count, bounds), price: overlay });
    }
  }
  if (overlayPoints.length >= 2) {
    ctx.strokeStyle = options.overlayColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    overlayPoints.forEach((p, i) => {
      const y = yOf(p.price);
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    });
    ctx.stroke();
    ctx.fillStyle = options.overlayColor;
    overlayPoints.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, yOf(p.price), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── 6. Vertical reference lines (SPOT / FLIP / MAX PAIN…) ───────────
  for (const ref of options.referenceLines) {
    const idx = nearestDatumIndex(data, ref.value);
    if (idx < 0) continue;
    const x = Math.round(indexToX(idx, count, bounds));

    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = ref.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padding.top);
    ctx.lineTo(x + 0.5, yZero);
    ctx.stroke();
    ctx.setLineDash([]);

    const text = ref.label;
    const textW = measureTextWidth(ctx, text);
    const pillW = textW + 8;
    const pillX = Math.max(padding.left + 2, Math.min(rightAxisX - pillW - 2, x - pillW / 2));
    ctx.fillStyle = ref.color;
    ctx.beginPath();
    ctx.roundRect(pillX, padding.top - 14, pillW, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#020616";
    ctx.font = "bold 9px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, pillX + pillW / 2, padding.top - 8);
  }

  // ── 7. Bottom category labels (thinned) ─────────────────────────────
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelVisible = thinLabels(count, plotWidth);
  data.forEach((d, i) => {
    if (!labelVisible[i] || !d.label) return;
    const x = indexToX(i, count, bounds);
    if (x < padding.left || x > rightAxisX) return;
    ctx.fillText(d.label, x, bottomAxisY + 7);
  });

  ctx.restore();
}

/**
 * Hover highlight band drawn on the overlay canvas (one slot wide).
 */
export function drawBarHoverBand(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  index: number,
  count: number
) {
  if (index < 0 || index >= count || count === 0) return;
  const { plotWidth, padding, chartHeight } = bounds;
  const bottomAxisY = chartHeight - padding.bottom;
  const slotWidth = plotWidth / count;
  const cx = indexToX(index, count, bounds);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(cx - slotWidth / 2, padding.top, slotWidth, bottomAxisY - padding.top);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(cx) + 0.5, padding.top);
  ctx.lineTo(Math.round(cx) + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}