import React, { useEffect, useMemo, useRef, useState } from "react";
import { VORTEX_THEME } from "../theme/tokens";
import type { ChartBounds } from "../engine/coordinates";
import { xToIndex } from "../engine/coordinates";
import {
  computeBarBounds,
  drawBarChart,
  drawBarHoverBand,
  type BarDatum,
  type BarReferenceLine,
} from "../engine/bars";
import { setupCanvasDpi } from "../engine/canvas";
import { drawVortexWatermark } from "../engine/watermark";
import { useChartSurface } from "../hooks/useChartSurface";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexBarChartProps {
  /** Bar data — one entry per slot (strike, expiration, …) */
  data: BarDatum[];
  /** Vertical reference lines anchored to the nearest datum.x */
  referenceLines?: BarReferenceLine[];
  height?: number;
  className?: string;
  /** Sign-based colors for the primary series (single-series mode) */
  posColor?: string;
  negColor?: string;
  posGlow?: string;
  negGlow?: string;
  /** Fixed primary bar color — overrides sign-based coloring */
  valueColor?: string;
  /** Fixed grouped second-bar color */
  value2Color?: string;
  overlayColor?: string;
  /** Right-axis value formatter (gridline labels) */
  formatValue?: (n: number) => string;
  tickCount?: number;
  /** Symmetric Y domain around zero (GEX-style); false clamps to include 0 */
  symmetric?: boolean;
  /** Custom HTML tooltip content; defaults to a glassmorphism value card */
  tooltipContent?: (datum: BarDatum, index: number) => React.ReactNode;
  showWatermark?: boolean;
}

function formatCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return formatPrice(n);
}

interface BarHoverState {
  index: number;
  x: number;
  y: number;
}

export const VortexBarChart: React.FC<VortexBarChartProps> = ({
  data,
  referenceLines = [],
  height = 300,
  className = "",
  posColor,
  negColor,
  posGlow,
  negGlow,
  valueColor,
  value2Color,
  overlayColor,
  formatValue = formatCompact,
  tickCount = 4,
  symmetric = true,
  tooltipContent,
  showWatermark = true,
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const [hover, setHover] = useState<BarHoverState | null>(null);
  const rafRef = useRef<number>(0);

  const merged = useMemo(
    () => ({
      posColor: posColor ?? VORTEX_THEME.colors.bullish,
      negColor: negColor ?? VORTEX_THEME.colors.bearish,
      posGlow: posGlow ?? "#34d399",
      negGlow: negGlow ?? "#fb7185",
      overlayColor: overlayColor ?? VORTEX_THEME.colors.spot,
    }),
    [posColor, negColor, posGlow, negGlow, overlayColor]
  );

  // Drop stale hover state when the underlying data changes
  useEffect(() => {
    setHover(null);
  }, [data]);

  // Cancel any pending frame on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const bounds: ChartBounds = useMemo(
    () => computeBarBounds(data, containerWidth, height, symmetric),
    [data, containerWidth, height, symmetric]
  );

  const options = useMemo(
    () => ({
      ...merged,
      valueColor,
      value2Color,
      formatValue,
      tickCount,
      referenceLines,
    }),
    [merged, valueColor, value2Color, formatValue, tickCount, referenceLines]
  );

  // ── Main canvas: axes + bars + overlay + reference lines (no hover deps) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);
    drawBarChart(ctx, bounds, data, options);
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, dpr, bounds, data, options, showWatermark, canvasRef]);

  // ── Overlay canvas: hover highlight band only (O(1) redraw) ──────────
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);
    if (hover && data.length > 0) {
      drawBarHoverBand(ctx, bounds, hover.index, data.length);
    }
  }, [containerWidth, height, dpr, bounds, hover, data.length, overlayRef]);

  // ── Pointer handling (mouse + touch, rAF-coalesced) ───────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const index = xToIndex(x, data.length, bounds);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setHover({ index, x, y }));
  };

  const handlePointerLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setHover(null);
  };

  const hoveredDatum = hover != null ? data[hover.index] : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
          No data available
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="block h-full w-full cursor-crosshair"
            style={{ touchAction: "none" }}
          />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />
        </>
      )}

      {/* Floating tooltip (follows cursor, clamped to container) */}
      {hover && hoveredDatum && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: Math.min(Math.max(hover.x + 12, 4), Math.max(containerWidth - 200, 4)),
            top: Math.max(hover.y - 12, 4),
            transform: hover.x > containerWidth - 220 ? "translateX(-100%)" : undefined,
          }}
        >
          {tooltipContent ? (
            tooltipContent(hoveredDatum, hover.index)
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0b0c10]/95 p-3 shadow-2xl backdrop-blur-md">
              <div className="border-b border-white/10 pb-1 text-xs font-bold tabular-nums text-white">
                {hoveredDatum.label || `$${formatPrice(hoveredDatum.x)}`}
              </div>
              <div className="mt-2 space-y-1 text-[11px] tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Value:</span>
                  <span
                    className={`font-bold ${hoveredDatum.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {formatValue(hoveredDatum.value)}
                  </span>
                </div>
                {typeof hoveredDatum.value2 === "number" && (
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Secondary:</span>
                    <span className="font-bold text-rose-400">{formatValue(hoveredDatum.value2)}</span>
                  </div>
                )}
                {typeof hoveredDatum.overlay === "number" && (
                  <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                    <span className="text-zinc-400">Net:</span>
                    <span className="font-bold text-sky-300">{formatValue(hoveredDatum.overlay)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};