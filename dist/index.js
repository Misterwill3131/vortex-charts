"use client";

// src/components/VortexCandleChart.tsx
import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle as LineStyle2,
  CandlestickSeries
} from "lightweight-charts";

// src/theme/tokens.ts
var VORTEX_THEME = {
  colors: {
    spot: "#38bdf8",
    // Neon Cyan
    bullish: "#10b981",
    // Neon Emerald
    bearish: "#f43f5e",
    // Neon Crimson / Rose
    neutral: "#eab308",
    // Golden Yellow
    vwap: "#c084fc",
    // Lilac / Purple
    grid: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#71717a",
    textBright: "#ffffff",
    cardBg: "#020616"
  },
  typography: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 11
  },
  layout: {
    borderRadius: 16
  }
};

// src/utils/chart-defaults.ts
import { LineStyle } from "lightweight-charts";
function toLineStyle(style) {
  switch (style) {
    case "dashed":
      return LineStyle.Dashed;
    case "dotted":
      return LineStyle.Dotted;
    case "solid":
    default:
      return LineStyle.Solid;
  }
}
function formatCandleTime(timestampMs, isIntraday = false) {
  if (isIntraday) {
    return Math.floor(timestampMs / 1e3);
  }
  return new Date(timestampMs).toISOString().slice(0, 10);
}

// src/components/VortexCandleChart.tsx
import { jsx } from "react/jsx-runtime";
var VortexCandleChart = ({
  candles,
  priceLines = [],
  swingHigh,
  swingLow,
  spotPrice,
  atrBounds,
  height = 300,
  className = "",
  timeVisible = false,
  isIntraday = false,
  theme = {}
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: LineStyle2.Dotted },
        horzLines: { color: mergedColors.grid, style: LineStyle2.Dotted }
      },
      rightPriceScale: {
        visible: true,
        borderColor: mergedColors.border
      },
      leftPriceScale: {
        visible: false
      },
      timeScale: {
        borderColor: mergedColors.border,
        timeVisible
      },
      width: el.clientWidth,
      height
    });
    chartRef.current = chart;
    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId: "right",
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
      borderVisible: false,
      wickUpColor: mergedColors.bullish,
      wickDownColor: mergedColors.bearish
    });
    seriesRef.current = candleSeries;
    const formattedData = candles.map((c) => ({
      time: formatCandleTime(c.t, isIntraday),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    const uniqueByTime = Array.from(
      new Map(formattedData.map((d) => [d.time, d])).values()
    ).sort((a, b) => a.time < b.time ? -1 : 1);
    candleSeries.setData(uniqueByTime);
    if (typeof swingHigh === "number" && swingHigh > 0) {
      candleSeries.createPriceLine({
        price: swingHigh,
        color: mergedColors.bearish,
        lineWidth: 1,
        lineStyle: LineStyle2.Dashed,
        axisLabelVisible: true,
        title: `20D High $${swingHigh.toFixed(2)}`
      });
    }
    if (typeof swingLow === "number" && swingLow > 0) {
      candleSeries.createPriceLine({
        price: swingLow,
        color: mergedColors.bullish,
        lineWidth: 1,
        lineStyle: LineStyle2.Dashed,
        axisLabelVisible: true,
        title: `20D Low $${swingLow.toFixed(2)}`
      });
    }
    if (typeof spotPrice === "number" && spotPrice > 0) {
      candleSeries.createPriceLine({
        price: spotPrice,
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: LineStyle2.Solid,
        axisLabelVisible: true,
        title: `Spot $${spotPrice.toFixed(2)}`
      });
    }
    if (atrBounds?.upper && atrBounds.upper > 0) {
      candleSeries.createPriceLine({
        price: atrBounds.upper,
        color: "rgba(234, 179, 8, 0.7)",
        lineWidth: 1,
        lineStyle: LineStyle2.Dotted,
        axisLabelVisible: false,
        title: "ATR Upper"
      });
    }
    if (atrBounds?.lower && atrBounds.lower > 0) {
      candleSeries.createPriceLine({
        price: atrBounds.lower,
        color: "rgba(234, 179, 8, 0.7)",
        lineWidth: 1,
        lineStyle: LineStyle2.Dotted,
        axisLabelVisible: false,
        title: "ATR Lower"
      });
    }
    priceLines.forEach((line) => {
      candleSeries.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: line.lineWidth ?? 1,
        lineStyle: toLineStyle(line.lineStyle),
        axisLabelVisible: line.axisLabelVisible !== false,
        title: line.title
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
  }, [candles, priceLines, swingHigh, swingLow, spotPrice, atrBounds, height, timeVisible, isIntraday, mergedColors]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};

// src/components/VortexRangeChart.tsx
import { useEffect as useEffect2, useRef as useRef2 } from "react";
import {
  createChart as createChart2,
  ColorType as ColorType2,
  LineStyle as LineStyle3,
  CandlestickSeries as CandlestickSeries2,
  LineSeries
} from "lightweight-charts";
import { jsx as jsx2 } from "react/jsx-runtime";
var VortexRangeChart = ({
  candles,
  priorDay,
  premarket,
  vwapSeries = [],
  overlayMode = "all",
  height = 300,
  className = "",
  theme = {}
}) => {
  const containerRef = useRef2(null);
  const chartRef = useRef2(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  useEffect2(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = createChart2(el, {
      layout: {
        background: { type: ColorType2.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: LineStyle3.Dotted },
        horzLines: { color: mergedColors.grid, style: LineStyle3.Dotted }
      },
      rightPriceScale: {
        visible: true,
        borderColor: mergedColors.border
      },
      leftPriceScale: {
        visible: false
      },
      timeScale: {
        borderColor: mergedColors.border,
        timeVisible: true,
        secondsVisible: false
      },
      width: el.clientWidth,
      height
    });
    chartRef.current = chart;
    const candleSeries = chart.addSeries(CandlestickSeries2, {
      priceScaleId: "right",
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish,
      borderVisible: false,
      wickUpColor: mergedColors.bullish,
      wickDownColor: mergedColors.bearish
    });
    const chartData = candles.map((c) => ({
      time: Math.floor(c.t / 1e3),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    const uniqueData = Array.from(
      new Map(chartData.map((d) => [d.time, d])).values()
    ).sort((a, b) => a.time - b.time);
    candleSeries.setData(uniqueData);
    const showBoxes = overlayMode === "all" || overlayMode === "boxes";
    const showVwap = overlayMode === "all" || overlayMode === "vwap";
    if (showBoxes && priorDay && priorDay.high > 0) {
      candleSeries.createPriceLine({
        price: priorDay.high,
        color: "rgba(234, 179, 8, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dashed,
        axisLabelVisible: true,
        title: `PDH $${priorDay.high.toFixed(2)}`
      });
      candleSeries.createPriceLine({
        price: priorDay.mid,
        color: "rgba(234, 179, 8, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dotted,
        axisLabelVisible: false,
        title: `Prior Mid`
      });
      candleSeries.createPriceLine({
        price: priorDay.low,
        color: "rgba(234, 179, 8, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dashed,
        axisLabelVisible: true,
        title: `PDL $${priorDay.low.toFixed(2)}`
      });
    }
    if (showBoxes && premarket && premarket.high > 0) {
      candleSeries.createPriceLine({
        price: premarket.high,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dashed,
        axisLabelVisible: true,
        title: `PMH $${premarket.high.toFixed(2)}`
      });
      candleSeries.createPriceLine({
        price: premarket.mid,
        color: "rgba(56, 189, 248, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dotted,
        axisLabelVisible: false,
        title: `PM Mid`
      });
      candleSeries.createPriceLine({
        price: premarket.low,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle3.Dashed,
        axisLabelVisible: true,
        title: `PML $${premarket.low.toFixed(2)}`
      });
    }
    if (showVwap && vwapSeries.length > 0) {
      const vwapLine = chart.addSeries(LineSeries, {
        priceScaleId: "right",
        color: mergedColors.vwap,
        lineWidth: 2,
        lineStyle: LineStyle3.Solid
      });
      const vwapData = vwapSeries.map((v) => ({
        time: Math.floor(v.t / 1e3),
        value: v.vwap
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
  return /* @__PURE__ */ jsx2(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};

// src/components/VortexConeChart.tsx
import { useEffect as useEffect3, useRef as useRef3 } from "react";
import {
  createChart as createChart3,
  ColorType as ColorType3,
  LineStyle as LineStyle4,
  LineSeries as LineSeries2
} from "lightweight-charts";
import { jsx as jsx3 } from "react/jsx-runtime";
var VortexConeChart = ({
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
  theme = {}
}) => {
  const containerRef = useRef3(null);
  const chartRef = useRef3(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  const resolvedCandles = candles || historicalCandles || [];
  const resolvedSpot = spotPrice ?? currentPrice ?? 0;
  const resolvedHigh = rangeHigh ?? targetRange?.high ?? (expectedMove ? resolvedSpot + expectedMove.moveAbs : 0);
  const resolvedLow = rangeLow ?? targetRange?.low ?? (expectedMove ? resolvedSpot - expectedMove.moveAbs : 0);
  const resolvedExpDate = expirationDate || expectedMove?.expiration || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const resolvedDte = dte ?? expectedMove?.dte ?? 1;
  useEffect3(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = createChart3(el, {
      layout: {
        background: { type: ColorType3.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: LineStyle4.Dotted },
        horzLines: { color: mergedColors.grid, style: LineStyle4.Dotted }
      },
      rightPriceScale: {
        visible: true,
        borderColor: mergedColors.border
      },
      leftPriceScale: {
        visible: false
      },
      timeScale: {
        borderColor: mergedColors.border,
        timeVisible: false
      },
      width: el.clientWidth,
      height
    });
    chartRef.current = chart;
    const historySeries = chart.addSeries(LineSeries2, {
      priceScaleId: "right",
      color: mergedColors.spot,
      lineWidth: 2,
      lineStyle: LineStyle4.Solid,
      crosshairMarkerVisible: true
    });
    const histData = resolvedCandles.map((c) => ({
      time: new Date(c.t).toISOString().slice(0, 10),
      value: c.close
    }));
    const uniqueHist = Array.from(
      new Map(histData.map((d) => [d.time, d])).values()
    ).sort((a, b) => a.time < b.time ? -1 : 1);
    historySeries.setData(uniqueHist);
    if (uniqueHist.length > 0 && resolvedSpot > 0 && resolvedHigh > 0 && resolvedLow > 0) {
      const lastPoint = uniqueHist[uniqueHist.length - 1];
      let forwardDateStr = resolvedExpDate;
      if (forwardDateStr === lastPoint.time) {
        const d = new Date(lastPoint.time);
        d.setDate(d.getDate() + Math.max(1, resolvedDte));
        forwardDateStr = d.toISOString().slice(0, 10);
      }
      const upperConeSeries = chart.addSeries(LineSeries2, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle4.Dashed
      });
      upperConeSeries.setData([
        { time: lastPoint.time, value: resolvedSpot },
        { time: forwardDateStr, value: resolvedHigh }
      ]);
      const lowerConeSeries = chart.addSeries(LineSeries2, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle4.Dashed
      });
      lowerConeSeries.setData([
        { time: lastPoint.time, value: resolvedSpot },
        { time: forwardDateStr, value: resolvedLow }
      ]);
      upperConeSeries.createPriceLine({
        price: resolvedHigh,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle4.Dotted,
        axisLabelVisible: true,
        title: `Upper Target $${resolvedHigh.toFixed(2)}`
      });
      lowerConeSeries.createPriceLine({
        price: resolvedLow,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: LineStyle4.Dotted,
        axisLabelVisible: true,
        title: `Lower Target $${resolvedLow.toFixed(2)}`
      });
      historySeries.createPriceLine({
        price: resolvedSpot,
        color: mergedColors.spot,
        lineWidth: 1,
        lineStyle: LineStyle4.Solid,
        axisLabelVisible: true,
        title: `Spot $${resolvedSpot.toFixed(2)}`
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
    mergedColors
  ]);
  return /* @__PURE__ */ jsx3(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};
export {
  VORTEX_THEME,
  VortexCandleChart,
  VortexConeChart,
  VortexRangeChart,
  formatCandleTime,
  toLineStyle
};
//# sourceMappingURL=index.js.map