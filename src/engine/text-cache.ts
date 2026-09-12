/**
 * Memoizes ctx.measureText results keyed by (font, text).
 *
 * measureText is one of the most expensive Canvas calls when repeated every
 * frame (grid labels, axis badges, watermark). Widths for a given
 * font+text pair are deterministic within a session, so a simple Map works.
 */

const cache = new Map<string, number>();
const MAX_ENTRIES = 2000;

export function measureTextWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}\u0000${text}`;
  let width = cache.get(key);
  if (width === undefined) {
    width = ctx.measureText(text).width;
    // Bound memory: labels change with scale/price, so evict everything
    // past the cap instead of growing unbounded.
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(key, width);
  }
  return width;
}