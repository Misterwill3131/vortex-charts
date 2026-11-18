import type { Candle, GammaLevel, GammaProfilePoint, LevelChip } from "../types";
import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";

export interface LevelBand {
  min: number;
  max: number;
  inside: GammaLevel[];
  offscreen: { level: GammaLevel; edge: "top" | "bottom" }[];
}

/**
 * Price band for a gamma levels chart: candle high/low and spot, extended to
 * include levels within `spot * (1 ± bandPct)`, then padded. Levels that still
 * fall outside the band are reported as offscreen with the edge they belong to.
 */
export function computeLevelBand(
  candles: Candle[],
  spot: number,
  levels: GammaLevel[],
  bandPct = 0.03
): LevelBand {
  let lo = spot;
  let hi = spot;
  for (const c of candles) {
    if (c.low < lo) lo = c.low;
    if (c.high > hi) hi = c.high;
  }

  const nearLo = spot * (1 - bandPct);
  const nearHi = spot * (1 + bandPct);
  for (const l of levels) {
    if (l.price >= nearLo && l.price <= nearHi) {
      if (l.price < lo) lo = l.price;
      if (l.price > hi) hi = l.price;
    }
  }

  const pad = Math.max((hi - lo) * 0.06, spot * 0.001);
  const min = lo - pad;
  const max = hi + pad;

  const inside: GammaLevel[] = [];
  const offscreen: LevelBand["offscreen"] = [];
  for (const l of levels) {
    if (l.price >= min && l.price <= max) inside.push(l);
    else offscreen.push({ level: l, edge: l.price > max ? "top" : "bottom" });
  }
  return { min, max, inside, offscreen };
}

/**
 * Builds one chip per distinct price (same-price levels merge, text joined with
 * " · " in input order), then spreads chips so consecutive chips are at least
 * `minGapPx` apart, preserving order. Overlapping runs are centred on their
 * natural positions instead of drifting downward. When `bounds` is given,
 * chips are kept within [minY, maxY]; if they cannot all fit at `minGapPx`,
 * the gap is compressed evenly.
 */
export function layoutLevelChips(
  levels: GammaLevel[],
  toY: (p: number) => number,
  minGapPx = 18,
  bounds?: { minY: number; maxY: number }
): LevelChip[] {
  const groups = new Map<number, GammaLevel[]>();
  for (const l of levels) {
    const g = groups.get(l.price);
    if (g) g.push(l);
    else groups.set(l.price, [l]);
  }

  const chips: LevelChip[] = Array.from(groups.entries()).map(([price, group]) => ({
    y: toY(price),
    price,
    kinds: group.map((l) => l.kind),
    text: group.map((l) => l.label).join(" · "),
  }));

  chips.sort((a, b) => a.y - b.y);
  const n = chips.length;
  if (n === 0) return chips;

  let gap = minGapPx;
  if (bounds && n > 1) gap = Math.max(0, Math.min(gap, (bounds.maxY - bounds.minY) / (n - 1)));

  const natural = chips.map((c) => c.y);
  // Cluster = run of chips laid out at exact `gap` spacing from `top`.
  const clusters: { start: number; count: number; sum: number; top: number }[] = [];
  const place = (c: { start: number; count: number; sum: number; top: number }) => {
    c.top = c.sum / c.count;
    if (bounds) c.top = Math.max(bounds.minY, Math.min(c.top, bounds.maxY - (c.count - 1) * gap));
  };

  for (let i = 0; i < n; i++) {
    let cur = { start: i, count: 1, sum: natural[i], top: 0 };
    place(cur);
    for (;;) {
      const prev = clusters[clusters.length - 1];
      if (!prev || cur.top >= prev.top + prev.count * gap - 1e-9) break;
      clusters.pop();
      // Items of cur shift by prev.count * gap relative to prev's start.
      cur = {
        start: prev.start,
        count: prev.count + cur.count,
        sum: prev.sum + cur.sum - cur.count * prev.count * gap,
        top: 0,
      };
      place(cur);
    }
    clusters.push(cur);
  }

  for (const c of clusters) {
    for (let k = 0; k < c.count; k++) chips[c.start + k].y = c.top + k * gap;
  }
  return chips;
}

/**
 * Draws a diverging gamma-exposure profile as a price-aligned side panel.
 * Positive GEX extends right of the panel's center line, negative extends left.
 */
export function drawGammaSideProfile(
  ctx: CanvasRenderingContext2D,
  profile: GammaProfilePoint[],
  bounds: ChartBounds,
  opts: { x: number; width: number; posColor: string; negColor: string }
): void {
  if (!profile || profile.length === 0) return;

  // Only strikes inside the visible price range are scaled and drawn.
  const visible = profile.filter(
    (p) => p.strike >= bounds.minPrice && p.strike <= bounds.maxPrice
  );
  if (visible.length === 0) return;

  let maxAbs = 0;
  for (const p of visible) {
    const a = Math.abs(p.gex);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs <= 0) return;

  const sorted = [...visible].sort((a, b) => a.strike - b.strike);
  const ys = sorted.map((p) => priceToY(p.strike, bounds));
  const half = opts.width / 2;
  const centerX = opts.x + half;

  // Row height: smallest gap between neighbouring strikes, so bars don't overlap.
  let minGap = Infinity;
  for (let i = 1; i < ys.length; i++) {
    const g = Math.abs(ys[i - 1] - ys[i]);
    if (g > 0 && g < minGap) minGap = g;
  }
  const rowH = Math.max(1, isFinite(minGap) ? minGap * 0.8 : 4);

  ctx.save();
  if (typeof ctx.rect === "function" && typeof ctx.clip === "function") {
    ctx.beginPath();
    ctx.rect(opts.x, bounds.padding.top, opts.width, bounds.plotHeight);
    ctx.clip();
  }
  for (let i = 0; i < sorted.length; i++) {
    const { gex } = sorted[i];
    const w = (Math.abs(gex) / maxAbs) * half;
    if (w <= 0) continue;
    ctx.fillStyle = gex >= 0 ? opts.posColor : opts.negColor;
    const x = gex >= 0 ? centerX : centerX - w;
    ctx.fillRect(x, ys[i] - rowH / 2, w, rowH);
  }
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, bounds.padding.top);
  ctx.lineTo(centerX, bounds.padding.top + bounds.plotHeight);
  ctx.stroke();
  ctx.restore();
}
