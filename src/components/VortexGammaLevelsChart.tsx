import React, { useEffect, useMemo } from "react";
import type { Candle, GammaLevel, GammaLevelKind, GammaProfilePoint } from "../types";
import { type VortexThemeOverride, VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawCandlesticks } from "../engine/candles";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { computeLevelBand, layoutLevelChips, drawGammaSideProfile } from "../engine/gamma-levels";
import { measureTextWidth } from "../engine/text-cache";
import { useChartSurface } from "../hooks/useChartSurface";
import { formatCandleTime, formatPrice } from "../utils/chart-defaults";
import { colorWithAlpha } from "../utils/color";

export interface VortexGammaLevelsChartProps {
  candles: Candle[];                       // 5-min intraday, premarket included
  vwapSeries?: { t: number; vwap: number }[];
  levels: GammaLevel[];
  gammaProfile?: GammaProfilePoint[];
  spot: number;
  showLevels?: boolean;                    // eye toggle, default true
  height?: number;                         // default 420
  timeZone?: string;                       // default "America/New_York"
  emptyMessage?: string;                   // shown when candles is empty
  className?: string;
  theme?: VortexThemeOverride;
}

const LEVEL_STYLES: Record<GammaLevelKind, { color: string; dash: number[] }> = {
  callWall: { color: "#f87171", dash: [5, 4] },
  putWall: { color: "#34d399", dash: [5, 4] },
  maxPain: { color: "#fbbf24", dash: [1, 5] },
  flip: { color: "#60a5fa", dash: [6, 4] },
  pin: { color: "#2dd4bf", dash: [1, 5] },
  gexKing: { color: "#a78bfa", dash: [6, 3] },
  vwap: { color: "#9ca3af", dash: [8, 5] },
};

/** Line colour and dash pattern for a gamma level kind. */
export function levelStyle(kind: GammaLevelKind): { color: string; dash: number[] } {
  return LEVEL_STYLES[kind] ?? LEVEL_STYLES.vwap;
}

/** Edge badge text for a level outside the visible band, e.g. "▲ 759.73". */
export function offscreenBadgeText(price: number, edge: "top" | "bottom"): string {
  return `${edge === "top" ? "▲" : "▼"} ${formatPrice(price)}`;
}

/** Drops levels whose price is not a finite number. */
export function finiteLevels(levels: GammaLevel[]): GammaLevel[] {
  return levels.filter((l) => Number.isFinite(l.price));
}

/**
 * Spreads label centres so neighbours are at least `gap` px apart within
 * [minY, maxY], preserving order. Returns positions in input order.
 */
export function spreadLabelYs(ys: number[], gap: number, minY: number, maxY: number): number[] {
  const items: GammaLevel[] = ys.map((_, i) => ({ price: i, kind: "pin", label: String(i) }));
  const laid = layoutLevelChips(items, (i) => ys[i], gap, { minY, maxY });
  const out = new Array<number>(ys.length);
  for (const c of laid) out[c.price] = c.y;
  return out;
}

const FONT = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const BADGE_FONT = "bold 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const BADGE_H = 15;
const TIME_AXIS_H = 20;
const SPOT_DEFAULT = "#fb923c";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const VortexGammaLevelsChart: React.FC<VortexGammaLevelsChartProps> = ({
  candles,
  vwapSeries,
  levels,
  gammaProfile,
  spot,
  showLevels = true,
  height = 420,
  timeZone = "America/New_York",
  emptyMessage = "No intraday data yet",
  className = "",
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();

  const bullish = theme.colors?.bullish ?? VORTEX_THEME.colors.bullish;
  const bearish = theme.colors?.bearish ?? VORTEX_THEME.colors.bearish;
  const spotColor = theme.colors?.spot ?? SPOT_DEFAULT;
  const textColor = theme.colors?.text ?? VORTEX_THEME.colors.text;

  const cleanLevels = useMemo(() => (showLevels ? finiteLevels(levels) : []), [levels, showLevels]);
  const hasSpot = Number.isFinite(spot);
  const hasVolume = candles.some((c) => (c.volume ?? 0) > 0);

  const band = useMemo(() => {
    const ref = hasSpot ? spot : candles.length ? candles[candles.length - 1].close : NaN;
    if (!Number.isFinite(ref)) return null;
    return computeLevelBand(candles, ref, cleanLevels);
  }, [candles, spot, hasSpot, cleanLevels]);

  const layout = useMemo(() => {
    const badgeTexts = [
      ...(band?.inside.map((l) => formatPrice(l.price)) ?? []),
      ...(band?.offscreen.map((o) => offscreenBadgeText(o.level.price, o.edge)) ?? []),
      hasSpot ? formatPrice(spot) : "",
    ];
    const maxLen = badgeTexts.reduce((m, t) => Math.max(m, t.length), 0);
    const badgeCol = Math.max(64, Math.ceil(maxLen * 6.4 + 16));
    const profileW = gammaProfile && gammaProfile.length > 0
      ? Math.max(56, Math.round(containerWidth * 0.22))
      : 0;
    const volH = hasVolume ? Math.max(40, Math.round(height * 0.16)) : 0;
    return { badgeCol, profileW, volH };
  }, [band, hasSpot, spot, gammaProfile, containerWidth, height, hasVolume]);

  const bounds: ChartBounds | null = useMemo(() => {
    if (!band) return null;
    const padding = {
      top: 22,
      left: 8,
      right: layout.badgeCol + layout.profileW,
      bottom: layout.volH + TIME_AXIS_H + (layout.volH ? 6 : 0),
    };
    const base = computeBounds([band.min, band.max], containerWidth, height, padding);
    return { ...base, minPrice: band.min, maxPrice: band.max, priceRange: Math.max(band.max - band.min, 1e-4) };
  }, [band, layout, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds || !band) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);

    const { padding, plotHeight, plotWidth } = bounds;
    const plotTop = padding.top;
    const plotBottom = plotTop + plotHeight;
    const plotRight = padding.left + plotWidth;
    const badgeX = plotRight + 4;
    const badgeW = layout.badgeCol - 8;
    const toY = (p: number) => priceToY(p, bounds);
    const count = candles.length;

    drawGridAndAxes(ctx, bounds);

    // ── Gamma profile side panel ─────────────────────────────────────
    if (layout.profileW > 0 && gammaProfile) {
      const px = plotRight + layout.badgeCol;
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(px, plotTop, layout.profileW, plotHeight);
      ctx.font = FONT;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAMMA", px + layout.profileW / 2, plotTop - 11);
      drawGammaSideProfile(ctx, gammaProfile, bounds, {
        x: px + 2,
        width: layout.profileW - 4,
        posColor: colorWithAlpha(bullish, 0.55),
        negColor: colorWithAlpha(bearish, 0.6),
      });
    }

    // ── Level lines (under candles) ──────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, plotTop, plotWidth, plotHeight);
    ctx.clip();
    for (const l of band.inside) {
      const { color, dash } = levelStyle(l.kind);
      const y = Math.round(toY(l.price)) + 0.5;
      ctx.strokeStyle = colorWithAlpha(color, 0.75);
      ctx.lineWidth = 1;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Candles + VWAP series ────────────────────────────────────────
    if (count > 0) {
      drawCandlesticks(ctx, candles, bounds, { upColor: bullish, downColor: bearish });
    }
    if (vwapSeries && vwapSeries.length > 1 && count > 0) {
      const idxByT = new Map<number, number>();
      candles.forEach((c, i) => idxByT.set(c.t, i));
      ctx.strokeStyle = levelStyle("vwap").color;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      let started = false;
      for (const p of vwapSeries) {
        const i = idxByT.get(p.t);
        if (i === undefined || !Number.isFinite(p.vwap)) continue;
        const x = indexToX(i, count, bounds);
        const y = toY(p.vwap);
        if (started) ctx.lineTo(x, y);
        else { ctx.moveTo(x, y); started = true; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (hasSpot && spot >= bounds.minPrice && spot <= bounds.maxPrice) {
      const y = Math.round(toY(spot)) + 0.5;
      ctx.strokeStyle = colorWithAlpha(spotColor, 0.45);
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // ── Level chips (left) ───────────────────────────────────────────
    const chipBounds = { minY: plotTop + 9, maxY: plotBottom - 9 };
    const chips = layoutLevelChips(band.inside, toY, 18, chipBounds);
    ctx.font = BADGE_FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (const chip of chips) {
      const { color } = levelStyle(chip.kinds[0]);
      const w = measureTextWidth(ctx, chip.text) + 12;
      const x = padding.left + 6;
      roundRect(ctx, x, chip.y - BADGE_H / 2, w, BADGE_H, 3);
      ctx.fillStyle = "rgba(2, 6, 22, 0.88)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(chip.text, x + 6, chip.y + 0.5);
    }

    // ── Right price badges: levels, offscreen edges, spot ────────────
    type Badge = { y: number; text: string; color: string; fg: string };
    const badges: Badge[] = [];
    for (const chip of layoutLevelChips(band.inside, toY, 0)) {
      badges.push({ y: chip.y, text: formatPrice(chip.price), color: levelStyle(chip.kinds[0]).color, fg: "#0b1220" });
    }
    for (const o of band.offscreen) {
      badges.push({
        y: o.edge === "top" ? plotTop : plotBottom,
        text: offscreenBadgeText(o.level.price, o.edge),
        color: levelStyle(o.level.kind).color,
        fg: "#0b1220",
      });
    }
    if (hasSpot) {
      const sy = Math.max(plotTop, Math.min(plotBottom, toY(spot)));
      badges.push({ y: sy, text: formatPrice(spot), color: spotColor, fg: "#0b1220" });
    }
    const minBadgeY = Math.max(BADGE_H / 2 + 1, plotTop - 10);
    const maxBadgeY = plotBottom;
    const ys = spreadLabelYs(badges.map((b) => b.y), BADGE_H + 1, minBadgeY, maxBadgeY);
    ctx.font = BADGE_FONT;
    ctx.textAlign = "center";
    badges.forEach((b, i) => {
      const y = ys[i];
      ctx.fillStyle = "#020616";
      ctx.fillRect(badgeX - 2, y - BADGE_H / 2 - 1, badgeW + 4, BADGE_H + 2);
      roundRect(ctx, badgeX, y - BADGE_H / 2, badgeW, BADGE_H, 3);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.fillStyle = b.fg;
      ctx.fillText(b.text, badgeX + badgeW / 2, y + 0.5);
    });

    // ── Volume sub-panel ─────────────────────────────────────────────
    const volTop = plotBottom + 6;
    if (layout.volH > 0 && count > 0) {
      let maxVol = 0;
      for (const c of candles) if ((c.volume ?? 0) > maxVol) maxVol = c.volume ?? 0;
      const slot = plotWidth / Math.max(1, count);
      const barW = Math.max(1, Math.min(22, Math.floor(slot * 0.72)));
      candles.forEach((c, i) => {
        const v = c.volume ?? 0;
        if (v <= 0 || maxVol <= 0) return;
        const h = (v / maxVol) * (layout.volH - 12);
        ctx.fillStyle = colorWithAlpha(c.close >= c.open ? bullish : bearish, 0.6);
        ctx.fillRect(Math.round(indexToX(i, count, bounds) - barW / 2), volTop + layout.volH - h, barW, h);
      });
      ctx.font = FONT;
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("VOLUME", padding.left + 4, volTop + 1);
    }

    // ── Time axis ────────────────────────────────────────────────────
    if (count > 0) {
      const axisY = height - TIME_AXIS_H + 5;
      const maxLabels = Math.max(2, Math.min(6, Math.floor(plotWidth / 70)));
      const step = Math.max(1, Math.ceil(count / maxLabels));
      ctx.font = FONT;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let i = 0; i < count; i += step) {
        ctx.fillText(formatCandleTime(candles[i].t, true, timeZone), indexToX(i, count, bounds), axisY);
      }
    }

    drawVortexWatermark(ctx, bounds);
  }, [canvasRef, bounds, band, layout, containerWidth, height, dpr, candles, vwapSeries, gammaProfile, spot, hasSpot, bullish, bearish, spotColor, textColor, timeZone]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" style={{ touchAction: "pan-y" }} />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />
      {candles.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-md border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] font-mono text-zinc-400">
            {emptyMessage}
          </span>
        </div>
      )}
    </div>
  );
};
