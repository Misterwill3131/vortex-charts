import type { ChartBounds } from "./coordinates";
import { priceToY, nearestTimeIndex } from "./coordinates";
import { measureTextWidth } from "./text-cache";

/**
 * Time-anchored zone drawn behind the candles (FVG / Fair Value Gaps,
 * imbalances, open ranges). The zone starts at the candle nearest to
 * `anchorTime` and extends to the right edge of the plot.
 */
export interface ChartZone {
  /** Timestamp (ms) of the candle where the zone opens */
  anchorTime: number;
  /** Upper price bound */
  top: number;
  /** Lower price bound */
  bottom: number;
  /** Consequent Encroachment — 50% level, drawn dotted */
  ce?: number;
  /** Optional stacked label (e.g. "UP GAP $180–$185") */
  label?: string;
  /** Zone color as "#rrggbb" hex or "r,g,b" triplet */
  color: string;
}

interface ZoneRect {
  x1: number;
  x2: number;
  yTop: number;
  yBottom: number;
}

/**
 * Resolves a zone's pixel rectangle against the visible candle window.
 * Returns null when the zone is fully out of the visible time range or
 * degenerate. Anchors left of the visible window clamp to the plot's
 * left edge so the zone stays visible while panning history.
 */
export function computeZoneRect(
  zone: ChartZone,
  visible: { t: number }[],
  bounds: ChartBounds
): ZoneRect | null {
  if (visible.length === 0) return null;
  if (zone.anchorTime > visible[visible.length - 1].t) return null;

  const x2 = bounds.chartWidth - bounds.padding.right;
  let x1: number;
  if (zone.anchorTime < visible[0].t) {
    x1 = bounds.padding.left;
  } else {
    const idx = nearestTimeIndex(visible, zone.anchorTime);
    if (idx < 0) return null;
    const slot = bounds.plotWidth / visible.length;
    x1 = bounds.padding.left + idx * slot;
  }
  if (x2 - x1 < 1) return null;

  const yTop = priceToY(zone.top, bounds);
  const yBottom = priceToY(zone.bottom, bounds);
  if (!isFinite(yTop) || !isFinite(yBottom) || yBottom - yTop < 1) return null;

  return { x1, x2, yTop, yBottom };
}

/**
 * Parses "#rrggbb" or "r,g,b" into an rgb triplet for alpha compositing.
 */
export function parseZoneColor(color: string): { r: number; g: number; b: number } {
  const hex = color.replace("#", "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  const parts = color.split(",");
  if (parts.length === 3) {
    const r = Number(parts[0].trim());
    const g = Number(parts[1].trim());
    const b = Number(parts[2].trim());
    if (isFinite(r) && isFinite(g) && isFinite(b)) return { r, g, b };
  }
  return { r: 56, g: 189, b: 248 };
}

/**
 * Draws zones behind candles: translucent fill, dashed top/bottom borders,
 * dotted CE level, and vertically de-stacked labels.
 */
export function drawChartZones(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  zones: ChartZone[],
  visible: { t: number }[]
) {
  if (zones.length === 0 || visible.length === 0) return;

  const boxes: { x: number; y: number; rgb: string; label: string }[] = [];

  ctx.save();

  for (const zone of zones) {
    const rect = computeZoneRect(zone, visible, bounds);
    if (!rect) continue;

    const { r, g, b } = parseZoneColor(zone.color);
    const rgb = `${r}, ${g}, ${b}`;
    const { x1, x2, yTop, yBottom } = rect;

    // 1. Translucent range fill
    ctx.fillStyle = `rgba(${rgb}, 0.1)`;
    ctx.fillRect(x1, yTop, x2 - x1, yBottom - yTop);

    // 2. Dashed top & bottom borders
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([1.5, 2.5]);
    ctx.beginPath();
    ctx.moveTo(x1, Math.round(yTop) + 0.5);
    ctx.lineTo(x2, Math.round(yTop) + 0.5);
    ctx.moveTo(x1, Math.round(yBottom) + 0.5);
    ctx.lineTo(x2, Math.round(yBottom) + 0.5);
    ctx.stroke();
    ctx.restore();

    // 3. Dotted CE (50%) reaction level
    if (typeof zone.ce === "number" && isFinite(zone.ce)) {
      const yCe = priceToY(zone.ce, bounds);
      if (isFinite(yCe) && yCe >= yTop && yCe <= yBottom) {
        ctx.save();
        ctx.strokeStyle = `rgba(${rgb}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, Math.round(yCe) + 0.5);
        ctx.lineTo(x2, Math.round(yCe) + 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (zone.label) {
      boxes.push({ x: x1, y: yTop, rgb, label: zone.label });
    }
  }

  // 4. Labels — vertically de-stacked when they overlap horizontally
  if (boxes.length > 0) {
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = "600 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textBaseline = "alphabetic";
    const LABEL_H = 13;
    const placed: { x1: number; x2: number; y: number }[] = [];
    boxes.sort((a, b) => a.y - b.y);
    for (const b of boxes) {
      const lx = b.x + 4;
      const w = measureTextWidth(ctx, b.label) + 6;
      let ly = b.y + 11;
      let guard = 0;
      while (
        guard++ < 60 &&
        placed.some((p) => lx < p.x2 && lx + w > p.x1 && Math.abs(p.y - ly) < LABEL_H)
      ) {
        ly += LABEL_H;
      }
      placed.push({ x1: lx, x2: lx + w, y: ly });
      ctx.fillStyle = "rgba(12, 14, 20, 0.72)";
      ctx.fillRect(lx - 3, ly - 9, w, 12);
      ctx.fillStyle = `rgba(${b.rgb}, 0.95)`;
      ctx.fillText(b.label, lx, ly);
    }
    ctx.restore();
  }

  ctx.restore();
}