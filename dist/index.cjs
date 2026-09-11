"use client";
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VORTEX_THEME: () => VORTEX_THEME,
  VortexCandleChart: () => VortexCandleChart,
  VortexConeChart: () => VortexConeChart,
  VortexRangeChart: () => VortexRangeChart,
  formatCandleTime: () => formatCandleTime,
  toLineStyle: () => toLineStyle
});
module.exports = __toCommonJS(index_exports);

// src/components/VortexCandleChart.tsx
var import_react = require("react");
var import_lightweight_charts2 = require("lightweight-charts");

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
var import_lightweight_charts = require("lightweight-charts");
function toLineStyle(style) {
  switch (style) {
    case "dashed":
      return import_lightweight_charts.LineStyle.Dashed;
    case "dotted":
      return import_lightweight_charts.LineStyle.Dotted;
    case "solid":
    default:
      return import_lightweight_charts.LineStyle.Solid;
  }
}
function formatCandleTime(timestampMs, isIntraday = false) {
  if (isIntraday) {
    return Math.floor(timestampMs / 1e3);
  }
  return new Date(timestampMs).toISOString().slice(0, 10);
}

// src/components/VortexCandleChart.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var VortexCandleChart = ({
  candles,
  priceLines = [],
  height = 300,
  className = "",
  timeVisible = false,
  isIntraday = false,
  theme = {}
}) => {
  const containerRef = (0, import_react.useRef)(null);
  const chartRef = (0, import_react.useRef)(null);
  const seriesRef = (0, import_react.useRef)(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  (0, import_react.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = (0, import_lightweight_charts2.createChart)(el, {
      layout: {
        background: { type: import_lightweight_charts2.ColorType.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: import_lightweight_charts2.LineStyle.Dotted },
        horzLines: { color: mergedColors.grid, style: import_lightweight_charts2.LineStyle.Dotted }
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
    const candleSeries = chart.addSeries(import_lightweight_charts2.CandlestickSeries, {
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
  }, [candles, priceLines, height, timeVisible, isIntraday, mergedColors]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};

// src/components/VortexRangeChart.tsx
var import_react2 = require("react");
var import_lightweight_charts3 = require("lightweight-charts");
var import_jsx_runtime2 = require("react/jsx-runtime");
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
  const containerRef = (0, import_react2.useRef)(null);
  const chartRef = (0, import_react2.useRef)(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  (0, import_react2.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = (0, import_lightweight_charts3.createChart)(el, {
      layout: {
        background: { type: import_lightweight_charts3.ColorType.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: import_lightweight_charts3.LineStyle.Dotted },
        horzLines: { color: mergedColors.grid, style: import_lightweight_charts3.LineStyle.Dotted }
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
    const candleSeries = chart.addSeries(import_lightweight_charts3.CandlestickSeries, {
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
        lineStyle: import_lightweight_charts3.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PDH $${priorDay.high.toFixed(2)}`
      });
      candleSeries.createPriceLine({
        price: priorDay.mid,
        color: "rgba(234, 179, 8, 0.5)",
        lineWidth: 1,
        lineStyle: import_lightweight_charts3.LineStyle.Dotted,
        axisLabelVisible: false,
        title: `Prior Mid`
      });
      candleSeries.createPriceLine({
        price: priorDay.low,
        color: "rgba(234, 179, 8, 0.8)",
        lineWidth: 1,
        lineStyle: import_lightweight_charts3.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PDL $${priorDay.low.toFixed(2)}`
      });
    }
    if (showBoxes && premarket && premarket.high > 0) {
      candleSeries.createPriceLine({
        price: premarket.high,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: import_lightweight_charts3.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PMH $${premarket.high.toFixed(2)}`
      });
      candleSeries.createPriceLine({
        price: premarket.mid,
        color: "rgba(56, 189, 248, 0.5)",
        lineWidth: 1,
        lineStyle: import_lightweight_charts3.LineStyle.Dotted,
        axisLabelVisible: false,
        title: `PM Mid`
      });
      candleSeries.createPriceLine({
        price: premarket.low,
        color: "rgba(56, 189, 248, 0.8)",
        lineWidth: 1,
        lineStyle: import_lightweight_charts3.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PML $${premarket.low.toFixed(2)}`
      });
    }
    if (showVwap && vwapSeries.length > 0) {
      const vwapLine = chart.addSeries(import_lightweight_charts3.LineSeries, {
        priceScaleId: "right",
        color: mergedColors.vwap,
        lineWidth: 2,
        lineStyle: import_lightweight_charts3.LineStyle.Solid
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};

// src/components/VortexConeChart.tsx
var import_react3 = require("react");
var import_lightweight_charts4 = require("lightweight-charts");
var import_jsx_runtime3 = require("react/jsx-runtime");
var VortexConeChart = ({
  candles,
  currentPrice,
  expirationDate,
  dte = 1,
  rangeHigh,
  rangeLow,
  height = 280,
  className = "",
  theme = {}
}) => {
  const containerRef = (0, import_react3.useRef)(null);
  const chartRef = (0, import_react3.useRef)(null);
  const mergedColors = { ...VORTEX_THEME.colors, ...theme.colors || {} };
  (0, import_react3.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    el.replaceChildren();
    const chart = (0, import_lightweight_charts4.createChart)(el, {
      layout: {
        background: { type: import_lightweight_charts4.ColorType.Solid, color: "transparent" },
        textColor: mergedColors.text,
        fontSize: VORTEX_THEME.typography.fontSize,
        fontFamily: VORTEX_THEME.typography.fontFamily
      },
      grid: {
        vertLines: { color: mergedColors.grid, style: import_lightweight_charts4.LineStyle.Dotted },
        horzLines: { color: mergedColors.grid, style: import_lightweight_charts4.LineStyle.Dotted }
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
    const historySeries = chart.addSeries(import_lightweight_charts4.LineSeries, {
      priceScaleId: "right",
      color: mergedColors.spot,
      lineWidth: 2,
      lineStyle: import_lightweight_charts4.LineStyle.Solid,
      crosshairMarkerVisible: true
    });
    const histData = candles.map((c) => ({
      time: new Date(c.t).toISOString().slice(0, 10),
      value: c.close
    }));
    const uniqueHist = Array.from(
      new Map(histData.map((d) => [d.time, d])).values()
    ).sort((a, b) => a.time < b.time ? -1 : 1);
    historySeries.setData(uniqueHist);
    if (uniqueHist.length > 0) {
      const lastPoint = uniqueHist[uniqueHist.length - 1];
      let forwardDateStr = expirationDate;
      if (forwardDateStr === lastPoint.time) {
        const d = new Date(lastPoint.time);
        d.setDate(d.getDate() + Math.max(1, dte));
        forwardDateStr = d.toISOString().slice(0, 10);
      }
      const upperConeSeries = chart.addSeries(import_lightweight_charts4.LineSeries, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: import_lightweight_charts4.LineStyle.Dashed
      });
      upperConeSeries.setData([
        { time: lastPoint.time, value: currentPrice },
        { time: forwardDateStr, value: rangeHigh }
      ]);
      const lowerConeSeries = chart.addSeries(import_lightweight_charts4.LineSeries, {
        priceScaleId: "right",
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: import_lightweight_charts4.LineStyle.Dashed
      });
      lowerConeSeries.setData([
        { time: lastPoint.time, value: currentPrice },
        { time: forwardDateStr, value: rangeLow }
      ]);
      upperConeSeries.createPriceLine({
        price: rangeHigh,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: import_lightweight_charts4.LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Upper Target $${rangeHigh.toFixed(2)}`
      });
      lowerConeSeries.createPriceLine({
        price: rangeLow,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: import_lightweight_charts4.LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Lower Target $${rangeLow.toFixed(2)}`
      });
      historySeries.createPriceLine({
        price: currentPrice,
        color: mergedColors.spot,
        lineWidth: 1,
        lineStyle: import_lightweight_charts4.LineStyle.Solid,
        axisLabelVisible: true,
        title: `Spot $${currentPrice.toFixed(2)}`
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
  }, [candles, currentPrice, expirationDate, dte, rangeHigh, rangeLow, height, mergedColors]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      ref: containerRef,
      className: `w-full overflow-hidden ${className}`,
      style: { height }
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VORTEX_THEME,
  VortexCandleChart,
  VortexConeChart,
  VortexRangeChart,
  formatCandleTime,
  toLineStyle
});
//# sourceMappingURL=index.cjs.map