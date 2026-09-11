import React from "react";
import type { ChartBounds } from "./coordinates";

export function drawVortexWatermark(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  opacity: number = 0.45
) {
  const { chartHeight, padding } = bounds;
  const x = padding.left + 8;
  const y = chartHeight - padding.bottom - 16;

  ctx.save();
  ctx.globalAlpha = opacity;

  // 1. Draw VorteX Glyph (Cyan V-shaped stylized chevron)
  ctx.strokeStyle = "#38bdf8";
  ctx.fillStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Stylized V
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 5, y + 2);
  ctx.lineTo(x + 10, y - 8);
  ctx.stroke();

  // Subtle cyan glow dot in the center of the chevron
  ctx.beginPath();
  ctx.arc(x + 5, y - 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Draw "VorteX" typography
  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VorteX", x + 15, y - 3);

  // 3. Mini subtitle "CHARTS"
  ctx.font = "8px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("CHARTS", x + 56, y - 3);

  ctx.restore();
}

/**
 * Reusable React component for interactive VorteX watermark in the bottom-left corner
 */
export const VortexWatermarkOverlay: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`pointer-events-none absolute bottom-7 left-4 z-10 flex items-center gap-1.5 opacity-40 transition-opacity duration-200 hover:opacity-90 select-none ${className}`}
      aria-label="VorteX Charts"
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/20 border border-sky-400/30 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="m13 2-2 10 7-2-9 12 2-10-7 2z" />
        </svg>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-bold tracking-tight text-white/80">VorteX</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-400">Charts</span>
      </div>
    </div>
  );
};
