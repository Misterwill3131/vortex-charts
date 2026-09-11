import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { VORTEX_THEME } from "../theme/tokens";
import type { Candle, PriorDayRange, PremarketRange, VwapPoint } from "../types";

export interface VortexRangeChartProps {
  candles: Candle[];
  priorDay?: PriorDayRange | null;
  premarket?: PremarketRange | null;
  vwapSeries?: VwapPoint[];
  overlayMode?: "all" | "boxes" | "vwap" | "none";
  height?: number;
  className?: string;
  theme?: Partial<typeof VORTEX_THEME>;
}

export const VortexRangeChart: React.FC<VortexRangeChartProps> = ({
  candles,
  priorDay,
  premarket,
  vwapSeries = [],
  overlayMode = "all",
  height = 300,
  className = "",
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const mergedColors = { ...VORTEX_THEME.colors, ...(theme.colors || {}) };

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
        timeVisible: true,
        secondsVisible: false,
      },
      width: el.clientWidth,
      height,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId: "right",
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
      borderVisible: false,
      wickUpColor: mergedColors.bullish,
      wickDownColor: mergedColors.bearish,
    });

    const chartData = candles.map((c) => ({
      time: Math.floor(c.t / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const uniqueData = Array.from(
      new Map(chartData.map((d) => [d.time, d])).values()
    ).sort((a, b) => a.time - b.time);

    candleSeries.setData(uniqueData);

    const showBoxes = overlayMode === "all" || overlayMode === "boxes";
    const showVwap = overlayMode === "all" || overlayMode === "vwap";

    // ── Prior-Day Box Lines (Gold / Neutral) ─────────────────────────
    if (showBoxes && priorDay && priorDay.high > 0) {
      candleSeries.createPriceLine({
        price: priorDay.high,
        color: "rgba(234, 179, 8, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PDH $${priorDay.high.toFixed(2)}`,
      });
      candleSeries.createPriceLine({
        price: priorDay.mid,
        color: "rgba(234, 179, 8, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: `Prior Mid`,
      });
      candleSeries.createPriceLine({
        price: priorDay.low,
        color: "rgba(234, 179, 8, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PDL $${priorDay.low.toFixed(2)}`,
      });
    }

    // ── Premarket Box Lines (Cyan / Sky) ───────────────────────────
    if (showBoxes && premarket && premarket.high > 0) {
      candleSeries.createPriceLine({
        price: premarket.high,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PMH $${premarket.high.toFixed(2)}`,
      });
      candleSeries.createPriceLine({
        price: premarket.mid,
        color: "rgba(56, 189, 248, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: `PM Mid`,
      });
      candleSeries.createPriceLine({
        price: premarket.low,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PML $${premarket.low.toFixed(2)}`,
      });
    }

    // ── VWAP Line (Purple) ───────────────────────────────────
    if (showVwap && vwapSeries.length > 0) {
      const vwapLine = chart.addSeries(LineSeries, {
        priceScaleId: "right",
        color: mergedColors.vwap,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
      });

      const vwapData = vwapSeries.map((v) => ({
        time: Math.floor(v.t / 1000) as UTCTimestamp,
        value: v.vwap,
      }));
      const uniqueVwap = Array.from(
        new Map(vwapData.map((d) => [d.time, d])).values()
      ).sort((a, b) => a.time - b.time);

      vwapLine.setData(uniqueVwap);
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
  }, [candles, priorDay, premarket, vwapSeries, overlayMode, height, mergedColors]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height }}
    />
  );
};
