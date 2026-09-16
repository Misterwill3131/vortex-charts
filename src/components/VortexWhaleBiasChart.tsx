import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawVortexWatermark } from "../engine/watermark";
import {
  computeBiasBounds,
  drawWhaleBiasChart,
  formatBiasTime,
  getBiasPointCoords,
  type WhaleBiasPoint,
} from "../engine/bias";

export interface VortexWhaleBiasChartProps {
  /** Intraday time-series points with scannedAt timestamp and callPct (0-100) */
  points: WhaleBiasPoint[];
  /** Chart height in pixels (defaults to 180) */
  height?: number;
  /** Extra container className */
  className?: string;
  /** Optional bottom caption or summary label */
  label?: string;
  /** Whether to draw official brand watermark */
  showWatermark?: boolean;
  /** Whether to show the 50% equilibrium threshold line */
  showEquilibrium?: boolean;
  /** Optional secondary baseline points (e.g. 1D cumulative reference) drawn as subtle dashed line */
  baselinePoints?: WhaleBiasPoint[];
  /** Color/theme overrides */
  theme?: VortexThemeOverride;
}

export const VortexWhaleBiasChart: React.FC<VortexWhaleBiasChartProps> = ({
  points,
  height = 180,
  className = "",
  label,
  showWatermark = false,
  showEquilibrium = true,
  baselinePoints,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Deduplicate and sort chronologically
  const sortedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    return Array.from(new Map(points.map((p) => [p.scannedAt, p])).values()).sort(
      (a, b) => a.scannedAt - b.scannedAt
    );
  }, [points]);

  const sortedBaseline = useMemo(() => {
    if (!baselinePoints || baselinePoints.length === 0) return undefined;
    return Array.from(new Map(baselinePoints.map((p) => [p.scannedAt, p])).values()).sort(
      (a, b) => a.scannedAt - b.scannedAt
    );
  }, [baselinePoints]);

  const bounds = useMemo(() => {
    return computeBiasBounds(containerWidth, height);
  }, [containerWidth, height]);

  const coords = useMemo(() => {
    return getBiasPointCoords(sortedPoints, bounds);
  }, [sortedPoints, bounds]);

  const bullishColor = theme.colors?.bullish ?? "#10b981";
  const bearishColor = theme.colors?.bearish ?? "#f43f5e";

  // ── Main canvas: rendered only when dataset or size changes ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedPoints.length < 2) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawWhaleBiasChart(ctx, sortedPoints, bounds, {
      bullishColor,
      bearishColor,
      equilibriumValue: 50,
      lineWidth: 2.5,
      showEquilibrium,
      showBeacon: true,
      showGrid: true,
      baselinePoints: sortedBaseline,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, sortedPoints, bounds, bullishColor, bearishColor, showEquilibrium, showWatermark, canvasRef]);

  // ── Overlay canvas: 60 FPS interactive guideline & anchor dot ──
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIdx !== null && coords[hoverIdx]) {
      const active = coords[hoverIdx];
      const isBull = active.point.callPct >= 50;
      const dotColor = isBull ? bullishColor : bearishColor;

      // 1. Vertical guideline
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.moveTo(active.x, bounds.padding.top);
      ctx.lineTo(active.x, bounds.chartHeight - bounds.padding.bottom);
      ctx.stroke();

      // 2. Horizontal guideline to price/pct axis
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.moveTo(bounds.padding.left, active.y);
      ctx.lineTo(active.x, active.y);
      ctx.stroke();

      // 3. Glowing Anchor Dot
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(active.x, active.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(active.x, active.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(active.x, active.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIdx, coords, bullishColor, bearishColor]);

  // ── Hit-testing pointer move ──
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (coords.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Binary search or closest distance to mouseX
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const diff = Math.abs(coords[i].x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIdx(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIdx(null);
  };

  const activeCoord = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;
  const activePoint = activeCoord?.point ?? null;

  const activeBaseline = useMemo(() => {
    if (!activePoint || !sortedBaseline || sortedBaseline.length === 0) return null;
    let closest = sortedBaseline[0];
    let minDiff = Math.abs(closest.scannedAt - activePoint.scannedAt);
    for (let i = 1; i < sortedBaseline.length; i++) {
      const diff = Math.abs(sortedBaseline[i].scannedAt - activePoint.scannedAt);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sortedBaseline[i];
      }
    }
    return minDiff <= 60 * 60 * 1000 ? closest : null;
  }, [activePoint, sortedBaseline]);

  // Tooltip horizontal alignment
  const tooltipStyle = useMemo(() => {
    if (!activeCoord || containerWidth <= 0) return {};
    const pctLeft = (activeCoord.x / containerWidth) * 100;
    let translateX = "-50%";
    if (pctLeft < 18) translateX = "0%";
    if (pctLeft > 82) translateX = "-100%";

    return {
      left: `${pctLeft}%`,
      transform: `translateX(${translateX})`,
    };
  }, [activeCoord, containerWidth]);

  if (sortedPoints.length < 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-4 text-xs text-zinc-400 ${className}`}
        style={{ height }}
      >
        No intraday whale history yet for this ticker (data accrues during active market hours).
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none rounded-2xl border border-white/[0.08] bg-black/40 p-1 backdrop-blur-md"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        <canvas
          ref={overlayRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 block h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />

        {/* Enhanced Glassmorphic Floating Tooltip */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 z-20 rounded-xl border border-white/15 bg-[#0b0c10]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl transition-all"
            style={tooltipStyle}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-1 font-bold text-white">
              <span>{formatBiasTime(activePoint.scannedAt)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  activePoint.callPct >= 55
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : activePoint.callPct <= 45
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {activePoint.callPct >= 55 ? "Bullish" : activePoint.callPct <= 45 ? "Bearish" : "Neutral"}
              </span>
            </div>
            <div className="mt-1.5 space-y-1 tabular-nums">
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="font-semibold text-emerald-400">
                  {Math.round(activePoint.callPct * 10) / 10}% Calls
                </span>
                <span className="font-semibold text-rose-400">
                  {Math.round((100 - activePoint.callPct) * 10) / 10}% Puts
                </span>
              </div>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-rose-500/30">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, activePoint.callPct))}%` }}
                />
              </div>
              {activeBaseline && (
                <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/10 pt-1 mt-1">
                  <span>1D Cumulative:</span>
                  <span className="text-zinc-300 font-semibold">
                    {Math.round(activeBaseline.callPct * 10) / 10}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {label && <div className="text-[11px] text-zinc-400 font-medium px-1">{label}</div>}
    </div>
  );
};
