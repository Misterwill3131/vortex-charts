import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawMultiAreaChart, type MultiAreaSeries } from "../engine/multi-area";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexMultiAreaChartProps {
  series: MultiAreaSeries[];
  height?: number;
  className?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
  formatValue?: (v: number) => string;
  xAxisFormatter?: (index: number) => string;
}

export const VortexMultiAreaChart: React.FC<VortexMultiAreaChartProps> = ({
  series,
  height = 320,
  className = "",
  showWatermark = true,
  theme = {},
  formatValue,
  xAxisFormatter,
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const bounds: ChartBounds = useMemo(() => {
    const allValues: number[] = [];
    series.forEach((s) => {
      s.data.forEach((d) => {
        allValues.push(typeof d === "number" ? d : d.y);
      });
    });
    return computeBounds(
      allValues.length > 0 ? allValues : [0, 100],
      containerWidth,
      height,
      undefined,
      { allowZeroOrNegative: true }
    );
  }, [series, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);
    drawMultiAreaChart(ctx, series, bounds, {
      smooth: true,
      glow: true,
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, series, showWatermark, theme, canvasRef]);

  const maxPoints = Math.max(0, ...series.map((s) => s.data.length));

  // Multi-series 60 FPS interactive overlay crosshair with intersection markers
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (hoverIndex !== null && maxPoints > 0) {
      const snapX = indexToX(hoverIndex, maxPoints, bounds);
      const bottomAxisY = bounds.chartHeight - bounds.padding.bottom;

      ctx.save();

      // 1. Vertical timeline guide line
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(snapX) + 0.5, bounds.padding.top);
      ctx.lineTo(Math.round(snapX) + 0.5, bottomAxisY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Intersection dots on every series
      series.forEach((s) => {
        const item = s.data[hoverIndex];
        if (item === undefined) return;
        const val = typeof item === "number" ? item : item.y;
        const snapY = priceToY(val, bounds);

        ctx.beginPath();
        ctx.arc(snapX, snapY, 6, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.arc(snapX, snapY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 3. X-Axis badge
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      const firstItem = series[0]?.data[hoverIndex];
      const labelText = xAxisFormatter
        ? xAxisFormatter(hoverIndex)
        : (typeof firstItem === "object" && firstItem?.label)
        ? firstItem.label
        : `Timeline #${hoverIndex + 1}`;
      const badgeW = Math.max(64, labelText.length * 7.5);
      const badgeH = 16;
      const badgeX = Math.round(snapX - badgeW / 2);
      const badgeY = bottomAxisY + 4;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f1f5f9";
      ctx.font = "10px Inter, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, badgeX + badgeW / 2, badgeY + badgeH / 2);

      ctx.restore();
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, maxPoints, series, xAxisFormatter]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (maxPoints === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });

    const step = bounds.plotWidth / Math.max(1, maxPoints);
    const idx = Math.max(0, Math.min(maxPoints - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const firstItem = series[0]?.data[hoverIndex ?? 0];
  const activeLabel = hoverIndex !== null
    ? (xAxisFormatter
        ? xAxisFormatter(hoverIndex)
        : (typeof firstItem === "object" && firstItem?.label)
        ? firstItem.label
        : `Point ${hoverIndex + 1}`)
    : "";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      {/* Top series legend */}
      <div className="absolute top-2.5 right-4 z-20 flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: s.color,
                boxShadow: `0 0 6px ${s.color}`,
              }}
            />
            <span className="text-zinc-300 font-mono text-[11px]">{s.name}</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {hoverIndex !== null && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300"
          style={{
            left: Math.min(containerWidth - 210, Math.max(10, cursorPos.x + 16)),
            top: Math.min(height - 120, Math.max(10, cursorPos.y - 45)),
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="text-zinc-400 font-semibold">{activeLabel}</span>
            <span className="text-[10px] text-cyan-400 font-mono">0DTE FLOW</span>
          </div>
          <div className="flex flex-col gap-1">
            {series.map((s) => {
              const item = s.data[hoverIndex];
              if (item === undefined) return null;
              const val = typeof item === "number" ? item : item.y;
              const formattedVal = formatValue ? formatValue(val) : `$${formatPrice(val)}`;

              return (
                <div key={s.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-zinc-300 text-[11px]">{s.name}</span>
                  </div>
                  <strong className="text-white">{formattedVal}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
