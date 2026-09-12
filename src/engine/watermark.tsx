import React from "react";
import type { ChartBounds } from "./coordinates";
import { measureTextWidth } from "./text-cache";

/**
 * Draws the clean "VorteXbot.app" watermark on the Canvas (no third-party or placeholder icon).
 */
export function drawVortexWatermark(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  opacity: number = 0.5
) {
  const { chartHeight, padding } = bounds;
  const x = padding.left + 6;
  const y = chartHeight - padding.bottom - 14;

  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // "VorteX" in bold white
  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("VorteX", x, y);

  // "bot.app" in cyan #38bdf8
  const vortexWidth = measureTextWidth(ctx, "VorteX");
  ctx.font = "600 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("bot.app", x + vortexWidth, y);

  ctx.restore();
}

/**
 * Reusable React component for interactive VorteXbot.app watermark
 */
export const VortexWatermarkOverlay: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`pointer-events-none absolute bottom-6 left-4 z-10 flex items-baseline font-sans text-xs opacity-50 transition-opacity duration-200 hover:opacity-90 select-none ${className}`}
      aria-label="VorteXbot.app"
    >
      <span className="font-bold tracking-tight text-white">VorteX</span>
      <span className="font-semibold text-sky-400">bot.app</span>
    </div>
  );
};
