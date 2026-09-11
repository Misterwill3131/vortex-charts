import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  LineSeries,
  type IChartApi,
} from "lightweight-charts";
import { VORTEX_THEME } from "../theme/tokens";
import type { Candle, ExpectedMoveSpec, TargetRange } from "../types";

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
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const mergedColors = { ...VORTEX_THEME.colors, ...(theme.colors || {}) };

  // Resolve normalized inputs
  const resolvedCandles = candles || historicalCandles || [];
  const resolvedSpot = spotPrice ?? currentPrice ?? 0;
  const resolvedHigh = rangeHigh ?? targetRange?.high ?? (expectedMove ? resolvedSpot + expectedMove.moveAbs : 0);
  const resolvedLow = rangeLow ?? targetRange?.low ?? (expectedMove ? resolvedSpot - expectedMove.moveAbs : 0);
  const resolvedExpDate = expirationDate || expectedMove?.expiration || new Date().toISOString().slice(0, 10);
  const resolvedDte = dte ?? expectedMove?.dte ?? 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.replaceChildren();

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily,
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: LineStyle.Dotted },
        horzLines: { color: mergedColors.grid, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        visible: true,
        borderColor: mergedColors.border,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: mergedColors.border,
        timeVisible: false,
      },
      width: el.clientWidth,
      height,
    });
    chartRef.current = chart;

    // 1. Courbe historique des clôtures
    const historySeries = chart.addSeries(LineSeries, {
      priceScaleId: "right",
      color: mergedColors.spot,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
    });

    const histData = resolvedCandles.map((c) => ({
      time: new Date(c.t).toISOString().slice(0, 10),
      value: c.close,
    }));

    const uniqueHist = Array.from(
      new Map(histData.map((d) => [d.time, d])).values()
    ).sort((a, b) => (a.time < b.time ? -1 : 1));

    historySeries.setData(uniqueHist);

    // 2. Cône de projection forward (Spot -> Expiration)
    if (uniqueHist.length > 0 && resolvedSpot > 0 && resolvedHigh > 0 && resolvedLow > 0) {
      const lastPoint = uniqueHist[uniqueHist.length - 1];

      let forwardDateStr = resolvedExpDate;
      if (forwardDateStr === lastPoint.time) {
        const d = new Date(lastPoint.time);
        d.setDate(d.getDate() + Math.max(1, resolvedDte));
        forwardDateStr = d.toISOString().slice(0, 10);
      }

      // Ligne supérieure du cône (+move)
      const upperConeSeries = chart.addSeries(LineSeries, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });
      upperConeSeries.setData([
        { time: lastPoint.time, value: resolvedSpot },
        { time: forwardDateStr, value: resolvedHigh },
      ]);

      // Ligne inférieure du cône (-move)
      const lowerConeSeries = chart.addSeries(LineSeries, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });
      lowerConeSeries.setData([
        { time: lastPoint.time, value: resolvedSpot },
        { time: forwardDateStr, value: resolvedLow },
      ]);

      // Lignes de prix cibles
      upperConeSeries.createPriceLine({
        price: resolvedHigh,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Upper Target $${resolvedHigh.toFixed(2)}`,
      });

      lowerConeSeries.createPriceLine({
        price: resolvedLow,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Lower Target $${resolvedLow.toFixed(2)}`,
      });

      historySeries.createPriceLine({
        price: resolvedSpot,
        color: mergedColors.spot,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `Spot $${resolvedSpot.toFixed(2)}`,
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    resolvedCandles,
    resolvedSpot,
    resolvedExpDate,
    resolvedDte,
    resolvedHigh,
    resolvedLow,
    height,
    mergedColors,
  ]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height }}
    />
  );
};
