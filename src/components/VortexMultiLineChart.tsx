import React, { useEffect, useMemo, useState } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX, priceToY, type ChartBounds, type ViewportPadding } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawLineChart, type LineSeriesPoint } from "../engine/line-chart";
import { formatPrice } from "../utils/chart-defaults";

export interface MultiLineSeries {
  name: string;
  color?: string;
  data: (LineSeriesPoint | number)[];
  yAxis?: "left" | "right";
  strokeDash?: number[];
  strokeWidth?: number;
}

export interface VortexMultiLineChartProps {
  series: MultiLineSeries[];
  height?: number;
  className?: string;
  showPoints?: boolean;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
  leftPriceFormatter?: (p: number) => string;
  rightPriceFormatter?: (p: number) => string;
  xAxisFormatter?: (index: number) => string;
}

const DEFAULT_SERIES_COLORS = [
  "#38bdf8", // Sky
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#c084fc", // Purple
  "#eab308", // Amber
  "#f97316", // Orange
];

export const VortexMultiLineChart: React.FC<VortexMultiLineChartProps> = ({
  series,
  height = 340,
  className = "",
  showPoints = false,
  showWatermark = true,
  theme = {},
  leftPriceFormatter,
  rightPriceFormatter,
  xAxisFormatter,
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const normalizedSeries = useMemo(() => {
    return series.map((s, sIdx) => {
      const color = s.color || DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length];
      const points: LineSeriesPoint[] = s.data.map((pt, pIdx) => {
        if (typeof pt === "number") {
          return { price: pt, label: `Point ${pIdx + 1}` };
        }
        return pt;
      });
      return {
        name: s.name,
        color,
        points,
        yAxis: s.yAxis ?? "left",
        strokeDash: s.strokeDash,
        strokeWidth: s.strokeWidth,
      };
    });
  }, [series]);

  const hasRightAxis = useMemo(() => {
    return normalizedSeries.some((s) => s.yAxis === "right");
  }, [normalizedSeries]);

  const { leftBounds, rightBounds, bounds } = useMemo(() => {
    if (!hasRightAxis) {
      const allPrices: number[] = [];
      normalizedSeries.forEach((s) => {
        s.points.forEach((p) => allPrices.push(p.price));
      });
      const singleBounds = computeBounds(allPrices, containerWidth, height, undefined, { allowZeroOrNegative: true });
      return { leftBounds: singleBounds, rightBounds: singleBounds, bounds: singleBounds };
    }

    const dualPadding: ViewportPadding = {
      top: 20,
      bottom: 26,
      left: 56,
      right: 56,
    };

    const leftPrices: number[] = [];
    const rightPrices: number[] = [];

    normalizedSeries.forEach((s) => {
      const target = s.yAxis === "right" ? rightPrices : leftPrices;
      s.points.forEach((p) => target.push(p.price));
    });

    const lBounds = computeBounds(
      leftPrices.length > 0 ? leftPrices : [0, 100],
      containerWidth,
      height,
      dualPadding,
      { allowZeroOrNegative: true }
    );

    const rBounds = computeBounds(
      rightPrices.length > 0 ? rightPrices : [0, 100],
      containerWidth,
      height,
      dualPadding,
      { allowZeroOrNegative: true }
    );

    return { leftBounds: lBounds, rightBounds: rBounds, bounds: lBounds };
  }, [normalizedSeries, containerWidth, height, hasRightAxis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    if (!hasRightAxis) {
      drawGridAndAxes(ctx, bounds);
    } else {
      // Draw dual axes: left axis + right axis + gridlines
      const { chartWidth, chartHeight, plotWidth, padding, minPrice, maxPrice, priceRange } = leftBounds;
      const rightAxisX = chartWidth - padding.right;
      const bottomAxisY = chartHeight - padding.bottom;

      ctx.save();

      // Left axis vertical line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left - 0.5, padding.top);
      ctx.lineTo(padding.left - 0.5, bottomAxisY);
      ctx.stroke();

      // Right axis vertical line
      ctx.beginPath();
      ctx.moveTo(rightAxisX + 0.5, padding.top);
      ctx.lineTo(rightAxisX + 0.5, bottomAxisY);
      ctx.stroke();

      // Bottom horizontal axis line
      ctx.beginPath();
      ctx.moveTo(padding.left, bottomAxisY + 0.5);
      ctx.lineTo(rightAxisX, bottomAxisY + 0.5);
      ctx.stroke();

      // Horizontal grid lines and ticks
      const tickCount = 5;
      const leftStep = priceRange / (tickCount + 1);
      const rightStep = rightBounds.priceRange / (tickCount + 1);

      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      for (let i = 1; i <= tickCount; i++) {
        const lPrice = minPrice + i * leftStep;
        const rPrice = rightBounds.minPrice + i * rightStep;
        const y = Math.round(priceToY(lPrice, leftBounds));

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(padding.left, y + 0.5);
        ctx.lineTo(rightAxisX, y + 0.5);
        ctx.stroke();

        // Left tick text
        ctx.fillStyle = "#10b981"; // Accent left
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const lText = leftPriceFormatter ? leftPriceFormatter(lPrice) : `$${formatPrice(lPrice)}`;
        ctx.fillText(lText, padding.left - 8, y);

        // Right tick text
        ctx.fillStyle = "#fbbf24"; // Accent right
        ctx.textAlign = "left";
        const rText = rightPriceFormatter ? rightPriceFormatter(rPrice) : `$${formatPrice(rPrice)}`;
        ctx.fillText(rText, rightAxisX + 8, y);
      }

      ctx.restore();
    }

    normalizedSeries.forEach((s) => {
      const seriesBounds = s.yAxis === "right" ? rightBounds : leftBounds;
      drawLineChart(ctx, s.points, seriesBounds, {
        color: s.color,
        showArea: false,
        showPoints,
        strokeDash: s.strokeDash,
        lineWidth: s.strokeWidth ?? 2,
        glow: true,
        smooth: true,
      });
    });

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, leftBounds, rightBounds, normalizedSeries, showPoints, showWatermark, hasRightAxis, leftPriceFormatter, rightPriceFormatter, theme, canvasRef]);

  const maxPoints = Math.max(0, ...normalizedSeries.map((s) => s.points.length));

  // Multi-series 60 FPS overlay crosshair with intersection markers on every curve
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
      normalizedSeries.forEach((s) => {
        const pt = s.points[hoverIndex];
        if (!pt) return;
        const seriesBounds = s.yAxis === "right" ? rightBounds : leftBounds;
        const snapY = priceToY(pt.price, seriesBounds);

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
      const firstPt = normalizedSeries[0]?.points[hoverIndex];
      const labelText = xAxisFormatter
        ? xAxisFormatter(hoverIndex)
        : (firstPt?.label && !firstPt.label.startsWith("Point "))
        ? firstPt.label
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
  }, [overlayRef, containerWidth, height, bounds, leftBounds, rightBounds, hoverIndex, maxPoints, normalizedSeries, xAxisFormatter]);

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

  const firstPt = normalizedSeries[0]?.points[hoverIndex ?? 0];
  const activeLabel = hoverIndex !== null
    ? (xAxisFormatter
        ? xAxisFormatter(hoverIndex)
        : (firstPt?.label && !firstPt.label.startsWith("Point "))
        ? firstPt.label
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
        {normalizedSeries.map((s) => (
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
            <span className="text-[10px] text-cyan-400 font-mono">FLOW</span>
          </div>
          <div className="flex flex-col gap-1">
            {normalizedSeries.map((s) => {
              const pt = s.points[hoverIndex];
              if (!pt) return null;
              const formattedPrice = s.yAxis === "right"
                ? (rightPriceFormatter ? rightPriceFormatter(pt.price) : `$${formatPrice(pt.price)}`)
                : (leftPriceFormatter ? leftPriceFormatter(pt.price) : `$${formatPrice(pt.price)}`);

              return (
                <div key={s.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-zinc-300 text-[11px]">{s.name}</span>
                  </div>
                  <strong className="text-white">{formattedPrice}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
