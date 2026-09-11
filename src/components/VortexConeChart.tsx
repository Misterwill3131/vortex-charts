import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Candle, ExpectedMoveSpec, TargetRange } from "../types";
import { VORTEX_THEME } from "../theme/tokens";
import { computeBounds, indexToX, xToIndex, yToPrice } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawLineSeries, type DataPoint } from "../engine/lines";
import { drawPriceLines } from "../engine/price-lines";
import { drawVortexWatermark } from "../engine/watermark";
import { drawCrosshair, type HoverState } from "../engine/interaction";
import { drawRulerOverlay, type RulerState } from "../engine/ruler";
import { setupCanvasDpi } from "../engine/canvas";
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
  theme?: Partial<typeof VORTEX_THEME>;
}

export const VortexConeChart: React.FC<VortexConeChartProps> = ({
  candles,
  historicalCandles,
  currentPrice,
  spotPrice,
  expirationDate,
  expectedMove,
  targetRange,
  dte = 1,
  rangeHigh,
  rangeLow,
  height = 280,
  className = "",
  showWatermark = true,
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Ruler state
  const [ruler, setRuler] = useState<RulerState>({
    active: false,
    startPoint: null,
    currentPoint: null,
  });

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

  // Handle ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || 600);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Render Canvas
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

    // 6. Ruler measurement
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }

    // 7. Crosshair on hover
    if (hover && hover.candle && !ruler.active) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, false);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    histPoints,
    resolvedSpot,
    resolvedHigh,
    resolvedLow,
    totalSlots,
    priceLines,
    timeLabels,
    hover,
    ruler,
    showWatermark,
    mergedColors,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) return;
    const canvas = canvasRef.current;
    if (!canvas || resolvedCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const idx = xToIndex(mouseX, totalSlots, bounds);
    const candle = resolvedCandles[idx] || null;
    const price = yToPrice(mouseY, bounds);

    const point = {
      x: mouseX,
      y: mouseY,
      price,
      time: candle?.t,
      index: idx,
    };
    setRuler({
      active: true,
      startPoint: point,
      currentPoint: point,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || resolvedCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const idx = xToIndex(mouseX, totalSlots, bounds);
    const candle = resolvedCandles[idx] || null;
    const price = yToPrice(mouseY, bounds);

    if (ruler.active && ruler.startPoint) {
      setRuler((prev) => ({
        ...prev,
        currentPoint: {
          x: mouseX,
          y: mouseY,
          price,
          time: candle?.t,
          index: idx,
        },
      }));
      return;
    }

    setHover({ mouseX, mouseY, index: idx, candle });
  };

  const handleMouseUp = () => {
    // ruler stays active until clicked again
  };

  const handleMouseLeave = () => {
    setHover(null);
  };

  // Keyboard shortcut (Escape clears ruler)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRuler({ active: false, startPoint: null, currentPoint: null });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      onClick={() => {
        if (ruler.active && !ruler.startPoint) {
          setRuler({ active: false, startPoint: null, currentPoint: null });
        }
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair block w-full h-full"
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
