import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { VORTEX_THEME } from "../theme/tokens";
import { toLineStyle, formatCandleTime } from "../utils/chart-defaults";
import type { Candle, PriceLine } from "../types";

export interface VortexCandleChartProps {
  candles: Candle[];
  priceLines?: PriceLine[];
  height?: number;
  className?: string;
  timeVisible?: boolean;
  isIntraday?: boolean;
  theme?: Partial<typeof VORTEX_THEME>;
}

export const VortexCandleChart: React.FC<VortexCandleChartProps> = ({
  candles,
  priceLines = [],
  height = 300,
  className = "",
  timeVisible = false,
  isIntraday = false,
  theme = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

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
        timeVisible,
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
    seriesRef.current = candleSeries;

    // Deduplicate and format candles
    const formattedData = candles.map((c) => ({
      time: formatCandleTime(c.t, isIntraday) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const uniqueByTime = Array.from(
      new Map(formattedData.map((d) => [d.time, d])).values()
    ).sort((a, b) => (a.time < b.time ? -1 : 1));

    candleSeries.setData(uniqueByTime);

    // Apply price lines
    priceLines.forEach((line) => {
      candleSeries.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: line.lineWidth ?? 1,
        lineStyle: toLineStyle(line.lineStyle),
        axisLabelVisible: line.axisLabelVisible !== false,
        title: line.title,
      });
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, priceLines, height, timeVisible, isIntraday, mergedColors]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height }}
    />
  );
};
