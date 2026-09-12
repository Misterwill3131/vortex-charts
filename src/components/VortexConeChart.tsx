import React, { useEffect, useMemo } from "react";
import type { Candle, ExpectedMoveSpec, TargetRange } from "../types";
import { VORTEX_THEME, type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, indexToX } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawLineSeries, type DataPoint } from "../engine/lines";
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair } from "../engine/interaction";
import { drawRulerOverlay } from "../engine/ruler";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { useChartPointer } from "../hooks/useChartPointer";
import { formatCandleTime, formatPrice } from "../utils/chart-defaults";

export interface VortexConeChartProps {
  candles?: Candle[];
  historicalCandles?: Candle[];
  currentPrice?: number;
  spotPrice?: number;
  expirationDate?: string;
  expectedMove?: ExpectedMoveSpec;
  targetRange?: TargetRange;
  dte?: number;
  rangeHigh?: number;
  rangeLow?: number;
  height?: number;
  className?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexConeChart: React.FC<VortexConeChartProps> = ({
  candles,
  historicalCandles,
  currentPrice,
  spotPrice,
  expirationDate,
  expectedMove,
  targetRange,
  dte,
  rangeHigh,
  rangeLow,
  height = 280,
  className = "",
  showWatermark = true,
  theme = {},
}) => {
  // â”€â”€ Surface: container refs, width tracking, devicePixelRatio â”€â”€
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();

  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...(theme.colors || {}) }), [theme]);

  // Resolve normalized inputs
  const resolvedCandles = useMemo(() => {
    const raw = candles || historicalCandles || [];
    return Array.from(
      new Map(raw.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles, historicalCandles]);

  const resolvedSpot =
    spotPrice ??
    currentPrice ??
    (resolvedCandles.length > 0 ? resolvedCandles[resolvedCandles.length - 1].close : 0);
  const resolvedHigh =
    rangeHigh ?? targetRange?.high ?? (expectedMove ? resolvedSpot + expectedMove.moveAbs : 0);
  const resolvedLow =
    rangeLow ?? targetRange?.low ?? (expectedMove ? resolvedSpot - expectedMove.moveAbs : 0);
  const resolvedExpDate = expirationDate || expectedMove?.expiration || "Expiry";
  const resolvedDte = dte ?? expectedMove?.dte ?? 1;

  // Total points count including future projection steps
  const futureStepCount = Math.max(2, Math.min(6, resolvedDte));
  const totalSlots = resolvedCandles.length + futureStepCount;

  // Compute bounds
  const bounds = useMemo(() => {
    const prices: number[] = [];
    resolvedCandles.forEach((c) => prices.push(c.close));
    if (resolvedSpot > 0) prices.push(resolvedSpot);
    if (resolvedHigh > 0) prices.push(resolvedHigh);
    if (resolvedLow > 0) prices.push(resolvedLow);

    return computeBounds(prices, containerWidth, height);
  }, [resolvedCandles, resolvedSpot, resolvedHigh, resolvedLow, containerWidth, height]);

  // Historical line points
  const histPoints = useMemo<DataPoint[]>(() => {
    return resolvedCandles.map((c, idx) => ({
      x: indexToX(idx, totalSlots, bounds),
      price: c.close,
    }));
  }, [resolvedCandles, totalSlots, bounds]);

  // Generate bottom time labels
  const timeLabels = useMemo(() => {
    if (resolvedCandles.length === 0) return [];
    const labels: { x: number; text: string }[] = [];

    // Sample historical labels
    const maxHistLabels = Math.max(2, Math.floor(containerWidth / 150));
    const step = Math.max(1, Math.floor(resolvedCandles.length / maxHistLabels));

    for (let i = 0; i < resolvedCandles.length; i += step) {
      const c = resolvedCandles[i];
      const x = indexToX(i, totalSlots, bounds);
      labels.push({ x, text: formatCandleTime(c.t, false) });
    }

    // Future Expiry label
    const expiryX = indexToX(totalSlots - 1, totalSlots, bounds);
    labels.push({ x: expiryX, text: resolvedExpDate });

    return labels;
  }, [resolvedCandles, totalSlots, bounds, containerWidth, resolvedExpDate]);

  // Price target lines
  const priceLines = useMemo(() => {
    const list = [];
    if (resolvedHigh > 0) {
      list.push({
        price: resolvedHigh,
        color: mergedColors.neutral,
        lineWidth: 1 as const,
        lineStyle: "dotted" as const,
        title: `Upper Target $${formatPrice(resolvedHigh)}`,
        axisLabelVisible: true,
      });
    }
    if (resolvedLow > 0) {
      list.push({
        price: resolvedLow,
        color: mergedColors.neutral,
        lineWidth: 1 as const,
        lineStyle: "dotted" as const,
        title: `Lower Target $${formatPrice(resolvedLow)}`,
        axisLabelVisible: true,
      });
    }
    if (resolvedSpot > 0) {
      list.push({
        price: resolvedSpot,
        color: mergedColors.spot,
        lineWidth: 1 as const,
        lineStyle: "solid" as const,
        title: `Spot $${formatPrice(resolvedSpot)}`,
        axisLabelVisible: true,
      });
    }
    return list;
  }, [resolvedHigh, resolvedLow, resolvedSpot, mergedColors]);

  // â”€â”€ Pointer interaction: hover crosshair + Shift ruler (no pan/zoom on the cone) â”€â”€
  const { hover, ruler, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds,
    visible: resolvedCandles,
    // Hit-testing spans history + future projection slots
    slotCount: totalSlots,
    panZoom: false,
  });

  // â”€â”€ Main canvas: redraw ONLY when data / size changes (not on hover) â”€â”€
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Grid & Axes
    drawGridAndAxes(ctx, bounds, timeLabels);

    // 2. Historical Close Price Line with subtle cyan gradient fill
    if (histPoints.length > 1) {
      drawLineSeries(ctx, histPoints, bounds, {
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        fillGradient: true,
        gradientColorTop: "rgba(56, 189, 248, 0.18)",
        gradientColorBottom: "rgba(56, 189, 248, 0.00)",
      });
    }

    // 3. Forward Volatility Projection Cone (Spot -> Targets)
    if (histPoints.length > 0 && resolvedHigh > 0 && resolvedLow > 0) {
      const lastPoint = histPoints[histPoints.length - 1];
      const expiryX = indexToX(totalSlots - 1, totalSlots, bounds);

      // Upper cone projection line
      drawLineSeries(
        ctx,
        [
          { x: lastPoint.x, price: resolvedSpot },
          { x: expiryX, price: resolvedHigh },
        ],
        bounds,
        {
          color: mergedColors.neutral,
          lineWidth: 1.5,
          lineStyle: "dashed",
        }
      );

      // Lower cone projection line
      drawLineSeries(
        ctx,
        [
          { x: lastPoint.x, price: resolvedSpot },
          { x: expiryX, price: resolvedLow },
        ],
        bounds,
        {
          color: mergedColors.neutral,
          lineWidth: 1.5,
          lineStyle: "dashed",
        }
      );
    }

    // 4. Horizontal Target & Spot Price Lines
    drawPriceLines(ctx, priceLines, bounds);

    // 5. VorteX Watermark
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, dpr, bounds, histPoints, resolvedSpot, resolvedHigh, resolvedLow, totalSlots, priceLines, timeLabels, showWatermark, mergedColors, canvasRef]);

  // â”€â”€ Overlay canvas: lightweight crosshair + ruler, redrawn on hover only â”€â”€
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    // 1. Ruler measurement
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }

    // 2. Crosshair on hover (historical zone only)
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, bounds, hover, formatCandleTime(hover.candle.t, false));
    }
  }, [containerWidth, height, dpr, bounds, hover, ruler, overlayRef]);

  const spotDiff = useMemo(() => {
    if (!hover?.candle || resolvedSpot <= 0) return null;
    const diff = hover.candle.close - resolvedSpot;
    const pct = (diff / resolvedSpot) * 100;
    const isBullish = diff >= 0;
    const sign = isBullish ? "+" : "";
    return {
      text: `${sign}$${formatPrice(diff)} (${sign}${pct.toFixed(2)}% vs Spot)`,
      isBullish,
    };
  }, [hover, resolvedSpot]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        {...pointerHandlers}
        className="cursor-crosshair block h-full w-full"
        style={{ touchAction: "none" }}
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 block"
      />

      {/* Floating Glassmorphism Tooltip */}
      {hover && hover.candle && !ruler.active && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums">
          <span className="font-semibold text-zinc-300">
            {formatCandleTime(hover.candle.t, false)}
          </span>
          <div className="h-3 w-px bg-white/15" />
          <span>
            <strong className="text-zinc-500 font-normal">Close: </strong>
            <span className="font-bold text-sky-400">${formatPrice(hover.candle.close)}</span>
          </span>
          {spotDiff && (
            <>
              <div className="h-3 w-px bg-white/15" />
              <span
                className={`font-medium ${
                  spotDiff.isBullish ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {spotDiff.text}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};