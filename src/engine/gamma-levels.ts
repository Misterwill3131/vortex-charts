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
 * " · " in input order), then pushes chips apart so consecutive chips are at
 * least `minGapPx` apart, preserving top-to-bottom order.
 */
export function layoutLevelChips(
  levels: GammaLevel[],
  toY: (p: number) => number,
  minGapPx = 18
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
  for (let i = 1; i < chips.length; i++) {
    const minY = chips[i - 1].y + minGapPx;
    if (chips[i].y < minY) chips[i].y = minY;
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

  let maxAbs = 0;
  for (const p of profile) {
    const a = Math.abs(p.gex);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs <= 0) return;

  const sorted = [...profile].sort((a, b) => a.strike - b.strike);
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
