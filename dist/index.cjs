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
  VortexBarChart: () => VortexBarChart,
  VortexCandleChart: () => VortexCandleChart,
  VortexChartControls: () => VortexChartControls,
  VortexConeChart: () => VortexConeChart,
  VortexRangeChart: () => VortexRangeChart,
  VortexWatermarkOverlay: () => VortexWatermarkOverlay,
  computeBarBounds: () => computeBarBounds,
  computeZoneRect: () => computeZoneRect,
  createTailViewport: () => createTailViewport,
  createViewport: () => createViewport,
  drawBarChart: () => drawBarChart,
  drawBarHoverBand: () => drawBarHoverBand,
  drawChartZones: () => drawChartZones,
  drawRulerOverlay: () => drawRulerOverlay,
  drawVortexWatermark: () => drawVortexWatermark,
  followViewport: () => followViewport,
  formatCandleTime: () => formatCandleTime,
  formatChange: () => formatChange,
  formatPrice: () => formatPrice,
  formatVolume: () => formatVolume,
  getVisibleCount: () => getVisibleCount,
  getZoomLevel: () => getZoomLevel,
  isViewportZoomed: () => isViewportZoomed,
  measureTextWidth: () => measureTextWidth,
  nearestDatumIndex: () => nearestDatumIndex,
  nearestTimeIndex: () => nearestTimeIndex,
  panViewport: () => panViewport,
  parseZoneColor: () => parseZoneColor,
  publishCrosshairSync: () => publishCrosshairSync,
  resetViewport: () => resetViewport,
  subscribeCrosshairSync: () => subscribeCrosshairSync,
  thinLabels: () => thinLabels,
  timeToX: () => timeToX,
  useChartPointer: () => useChartPointer,
  useChartSurface: () => useChartSurface,
  useChartViewport: () => useChartViewport,
  useCrosshairSync: () => useCrosshairSync,
  viewportIndexToX: () => viewportIndexToX,
  viewportXToIndex: () => viewportXToIndex,
  xToTime: () => xToTime,
  zoomViewport: () => zoomViewport
});
module.exports = __toCommonJS(index_exports);

// src/components/VortexCandleChart.tsx
var import_react5 = require("react");

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

// src/engine/coordinates.ts
var DEFAULT_PADDING = {
  top: 20,
  bottom: 26,
  left: 12,
  right: 64
};
function computeBounds(prices, width, height, padding = DEFAULT_PADDING) {
  const validPrices = prices.filter(
    (p) => typeof p === "number" && !isNaN(p) && isFinite(p) && p > 0
  );
  let min = Infinity;
  let max = -Infinity;
  for (const p of validPrices) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  if (!isFinite(min) || !isFinite(max)) {
    min = 100;
    max = 105;
  }
  if (min === max) {
    min *= 0.98;
    max *= 1.02;
  }
  const span = max - min;
  const pad = Math.max(span * 0.08, 0.5);
  const minPrice = min - pad;
  const maxPrice = max + pad;
  const priceRange = maxPrice - minPrice;
  const plotWidth = Math.max(width - padding.left - padding.right, 10);
  const plotHeight = Math.max(height - padding.top - padding.bottom, 10);
  return {
    minPrice,
    maxPrice,
    priceRange,
    chartWidth: width,
    chartHeight: height,
    plotWidth,
    plotHeight,
    padding
  };
}
function priceToY(price, bounds) {
  const { minPrice, priceRange, plotHeight, padding } = bounds;
  if (priceRange <= 0) return padding.top + plotHeight / 2;
  const ratio = (price - minPrice) / priceRange;
  return padding.top + plotHeight * (1 - ratio);
}
function yToPrice(y, bounds) {
  const { minPrice, priceRange, plotHeight, padding } = bounds;
  const ratio = 1 - (y - padding.top) / plotHeight;
  return minPrice + ratio * priceRange;
}
function indexToX(index, totalCount, bounds) {
  const { plotWidth, padding } = bounds;
  if (totalCount <= 1) return padding.left + plotWidth / 2;
  const step = plotWidth / totalCount;
  return padding.left + index * step + step / 2;
}
function xToIndex(x, totalCount, bounds) {
  const { plotWidth, padding } = bounds;
  if (totalCount <= 0) return -1;
  const step = plotWidth / totalCount;
  const raw = Math.floor((x - padding.left) / step);
  return Math.max(0, Math.min(totalCount - 1, raw));
}
function timeToX(t, scale, bounds) {
  const span = scale.tMax - scale.tMin;
  if (span <= 0) return bounds.padding.left + bounds.plotWidth / 2;
  const ratio = (t - scale.tMin) / span;
  return bounds.padding.left + ratio * bounds.plotWidth;
}
function xToTime(x, scale, bounds) {
  const span = scale.tMax - scale.tMin;
  if (span <= 0) return scale.tMin;
  const ratio = (x - bounds.padding.left) / bounds.plotWidth;
  return scale.tMin + ratio * span;
}
function nearestTimeIndex(items, target) {
  if (items.length === 0) return -1;
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = lo + hi >> 1;
    if (items[mid].t < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(items[lo - 1].t - target) <= Math.abs(items[lo].t - target)) {
    return lo - 1;
  }
  return lo;
}
function viewportIndexToX(globalIndex, viewport, bounds) {
  const visibleCount = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const localIndex = globalIndex - viewport.startIndex;
  return indexToX(localIndex, visibleCount, bounds);
}
function viewportXToIndex(x, viewport, bounds) {
  const visibleCount = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const localIndex = xToIndex(x, visibleCount, bounds);
  if (localIndex < 0) return -1;
  return Math.max(0, Math.min(viewport.totalCount - 1, viewport.startIndex + localIndex));
}

// src/engine/text-cache.ts
var cache = /* @__PURE__ */ new Map();
var MAX_ENTRIES = 2e3;
function measureTextWidth(ctx, text) {
  const key = `${ctx.font}\0${text}`;
  let width = cache.get(key);
  if (width === void 0) {
    width = ctx.measureText(text).width;
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(key, width);
  }
  return width;
}

// src/engine/zones.ts
function computeZoneRect(zone, visible, bounds) {
  if (visible.length === 0) return null;
  if (zone.anchorTime > visible[visible.length - 1].t) return null;
  const x2 = bounds.chartWidth - bounds.padding.right;
  let x1;
  if (zone.anchorTime < visible[0].t) {
    x1 = bounds.padding.left;
  } else {
    const idx = nearestTimeIndex(visible, zone.anchorTime);
    if (idx < 0) return null;
    const slot = bounds.plotWidth / visible.length;
    x1 = bounds.padding.left + idx * slot;
  }
  if (x2 - x1 < 1) return null;
  const yTop = priceToY(zone.top, bounds);
  const yBottom = priceToY(zone.bottom, bounds);
  if (!isFinite(yTop) || !isFinite(yBottom) || yBottom - yTop < 1) return null;
  return { x1, x2, yTop, yBottom };
}
function parseZoneColor(color) {
  const hex = color.replace("#", "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  const parts = color.split(",");
  if (parts.length === 3) {
    const r = Number(parts[0].trim());
    const g = Number(parts[1].trim());
    const b = Number(parts[2].trim());
    if (isFinite(r) && isFinite(g) && isFinite(b)) return { r, g, b };
  }
  return { r: 56, g: 189, b: 248 };
}
function drawChartZones(ctx, bounds, zones, visible) {
  if (zones.length === 0 || visible.length === 0) return;
  const boxes = [];
  ctx.save();
  for (const zone of zones) {
    const rect = computeZoneRect(zone, visible, bounds);
    if (!rect) continue;
    const { r, g, b } = parseZoneColor(zone.color);
    const rgb = `${r}, ${g}, ${b}`;
    const { x1, x2, yTop, yBottom } = rect;
    ctx.fillStyle = `rgba(${rgb}, 0.1)`;
    ctx.fillRect(x1, yTop, x2 - x1, yBottom - yTop);
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([1.5, 2.5]);
    ctx.beginPath();
    ctx.moveTo(x1, Math.round(yTop) + 0.5);
    ctx.lineTo(x2, Math.round(yTop) + 0.5);
    ctx.moveTo(x1, Math.round(yBottom) + 0.5);
    ctx.lineTo(x2, Math.round(yBottom) + 0.5);
    ctx.stroke();
    ctx.restore();
    if (typeof zone.ce === "number" && isFinite(zone.ce)) {
      const yCe = priceToY(zone.ce, bounds);
      if (isFinite(yCe) && yCe >= yTop && yCe <= yBottom) {
        ctx.save();
        ctx.strokeStyle = `rgba(${rgb}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, Math.round(yCe) + 0.5);
        ctx.lineTo(x2, Math.round(yCe) + 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (zone.label) {
      boxes.push({ x: x1, y: yTop, rgb, label: zone.label });
    }
  }
  if (boxes.length > 0) {
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = "600 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textBaseline = "alphabetic";
    const LABEL_H = 13;
    const placed = [];
    boxes.sort((a, b) => a.y - b.y);
    for (const b of boxes) {
      const lx = b.x + 4;
      const w = measureTextWidth(ctx, b.label) + 6;
      let ly = b.y + 11;
      let guard = 0;
      while (guard++ < 60 && placed.some((p) => lx < p.x2 && lx + w > p.x1 && Math.abs(p.y - ly) < LABEL_H)) {
        ly += LABEL_H;
      }
      placed.push({ x1: lx, x2: lx + w, y: ly });
      ctx.fillStyle = "rgba(12, 14, 20, 0.72)";
      ctx.fillRect(lx - 3, ly - 9, w, 12);
      ctx.fillStyle = `rgba(${b.rgb}, 0.95)`;
      ctx.fillText(b.label, lx, ly);
    }
    ctx.restore();
  }
  ctx.restore();
}

// src/utils/chart-defaults.ts
function formatCandleTime(timestampMs, isIntraday = false, timeZone) {
  const d = new Date(timestampMs);
  const tz = timeZone ? { timeZone } : {};
  if (isIntraday) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...tz
    });
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...tz
  });
}
function formatPrice(price) {
  if (isNaN(price) || !isFinite(price)) return "\u2014";
  const abs = Math.abs(price);
  if (abs >= 1e4) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  if (abs >= 0.01) return price.toFixed(2);
  if (abs === 0) return "0.00";
  return price.toPrecision(4);
}

// src/engine/grid.ts
function drawGridAndAxes(ctx, bounds, timeLabels, tickCount = 5) {
  const { chartWidth, chartHeight, plotWidth, padding, minPrice, maxPrice, priceRange } = bounds;
  ctx.save();
  const rightAxisX = chartWidth - padding.right;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightAxisX + 0.5, padding.top);
  ctx.lineTo(rightAxisX + 0.5, chartHeight - padding.bottom);
  ctx.stroke();
  const bottomAxisY = chartHeight - padding.bottom;
  ctx.beginPath();
  ctx.moveTo(padding.left, bottomAxisY + 0.5);
  ctx.lineTo(chartWidth, bottomAxisY + 0.5);
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillStyle = "#71717a";
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const step = priceRange / (tickCount + 1);
  for (let i = 1; i <= tickCount; i++) {
    const price = minPrice + i * step;
    const y = Math.round(priceToY(price, bounds));
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();
    ctx.fillText(formatPrice(price), rightAxisX + 8, y);
  }
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const item of timeLabels) {
    if (item.x >= padding.left && item.x <= rightAxisX) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(item.x + 0.5, bottomAxisY);
      ctx.lineTo(item.x + 0.5, bottomAxisY + 4);
      ctx.stroke();
      ctx.fillText(item.text, item.x, bottomAxisY + 7);
    }
  }
  ctx.restore();
}

// src/engine/candles.ts
var DEFAULT_CANDLE_STYLE = {
  upColor: "#10b981",
  // Bullish Emerald
  downColor: "#f43f5e"
  // Bearish Rose
};
function drawCandlesticks(ctx, candles, bounds, style = DEFAULT_CANDLE_STYLE, timeScale) {
  if (candles.length === 0) return;
  const count = candles.length;
  const xOf = (idx) => timeScale ? timeToX(candles[idx].t, timeScale, bounds) : indexToX(idx, count, bounds);
  let slotWidth = bounds.plotWidth / count;
  if (timeScale) {
    let minGap = Infinity;
    for (let i = 1; i < count; i++) {
      const gap = xOf(i) - xOf(i - 1);
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    if (isFinite(minGap)) slotWidth = Math.min(slotWidth, minGap);
  }
  const candleBodyWidth = Math.max(2, Math.min(22, Math.floor(slotWidth * 0.72)));
  ctx.save();
  candles.forEach((c, idx) => {
    const x = Math.round(xOf(idx));
    const isUp = c.close >= c.open;
    const color = isUp ? style.upColor : style.downColor;
    const yHigh = Math.round(priceToY(c.high, bounds));
    const yLow = Math.round(priceToY(c.low, bounds));
    const yOpen = Math.round(priceToY(c.open, bounds));
    const yClose = Math.round(priceToY(c.close, bounds));
    const yBodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, yHigh);
    ctx.lineTo(x + 0.5, yLow);
    ctx.stroke();
    ctx.fillStyle = color;
    const xBodyLeft = Math.round(x - candleBodyWidth / 2);
    ctx.fillRect(xBodyLeft, yBodyTop, candleBodyWidth, bodyHeight);
  });
  ctx.restore();
}

// src/engine/price-lines.ts
function drawPriceLines(ctx, lines, bounds) {
  const { chartWidth, padding, minPrice, maxPrice } = bounds;
  const rightAxisX = chartWidth - padding.right;
  ctx.save();
  lines.forEach((line) => {
    if (typeof line.price !== "number" || isNaN(line.price)) return;
    if (line.price < minPrice || line.price > maxPrice) return;
    const y = Math.round(priceToY(line.price, bounds));
    const lineWidth = line.lineWidth ?? 1;
    if (line.lineStyle === "dashed") {
      ctx.setLineDash([5, 4]);
    } else if (line.lineStyle === "dotted") {
      ctx.setLineDash([2, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = line.color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();
    if (line.title) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const textWidth = measureTextWidth(ctx, line.title);
      const tagX = rightAxisX - textWidth - 10;
      const tagY = y - 7;
      ctx.fillStyle = "rgba(2, 6, 22, 0.75)";
      ctx.fillRect(tagX - 4, tagY - 8, textWidth + 8, 14);
      ctx.fillStyle = line.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(line.title, tagX, tagY - 1);
      ctx.restore();
    }
    if (line.axisLabelVisible !== false) {
      ctx.save();
      ctx.setLineDash([]);
      const labelText = formatPrice(line.price);
      ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const labelWidth = measureTextWidth(ctx, labelText);
      const pillWidth = labelWidth + 10;
      const pillHeight = 16;
      const pillX = rightAxisX + 4;
      const pillY = Math.round(y - pillHeight / 2);
      ctx.fillStyle = line.color;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 3);
      ctx.fill();
      ctx.fillStyle = "#020616";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, pillX + pillWidth / 2, pillY + pillHeight / 2);
      ctx.restore();
    }
  });
  ctx.restore();
}

// src/engine/watermark.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function drawVortexWatermark(ctx, bounds, opacity = 0.5) {
  const { chartHeight, padding } = bounds;
  const x = padding.left + 6;
  const y = chartHeight - padding.bottom - 14;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("VorteX", x, y);
  const vortexWidth = measureTextWidth(ctx, "VorteX");
  ctx.font = "600 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("bot.app", x + vortexWidth, y);
  ctx.restore();
}
var VortexWatermarkOverlay = ({ className = "" }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: `pointer-events-none absolute bottom-6 left-4 z-10 flex items-baseline font-sans text-xs opacity-50 transition-opacity duration-200 hover:opacity-90 select-none ${className}`,
      "aria-label": "VorteXbot.app",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold tracking-tight text-white", children: "VorteX" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-semibold text-sky-400", children: "bot.app" })
      ]
    }
  );
};

// src/engine/interaction.ts
var WICK_MAGNET_PX = 8;
function drawCrosshair(ctx, bounds, hover, timeText) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const { snapX, mouseY, candle } = hover;
  if (snapX < padding.left || snapX > rightAxisX || mouseY < padding.top || mouseY > bottomAxisY) {
    return;
  }
  let crossY = mouseY;
  let snappedToWick = false;
  if (candle) {
    const yHigh = priceToY(candle.high, bounds);
    const yLow = priceToY(candle.low, bounds);
    if (Math.abs(mouseY - yHigh) <= WICK_MAGNET_PX) {
      crossY = yHigh;
      snappedToWick = true;
    } else if (Math.abs(mouseY - yLow) <= WICK_MAGNET_PX) {
      crossY = yLow;
      snappedToWick = true;
    }
  }
  const cursorPrice = yToPrice(crossY, bounds);
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(snapX + 0.5, padding.top);
  ctx.lineTo(snapX + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, crossY + 0.5);
  ctx.lineTo(rightAxisX, crossY + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const priceText = `$${formatPrice(cursorPrice)}`;
  const textW = measureTextWidth(ctx, priceText);
  const pillW = textW + 10;
  const pillH = 16;
  const pillX = rightAxisX + 4;
  const pillY = Math.round(crossY - pillH / 2);
  ctx.fillStyle = snappedToWick ? "#10b981" : "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceText, pillX + pillW / 2, pillY + pillH / 2);
  if (timeText) {
    ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const timeW = measureTextWidth(ctx, timeText) + 12;
    const timeH = 16;
    const timeX = Math.round(snapX - timeW / 2);
    const timeY = bottomAxisY + 4;
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(timeX, timeY, timeW, timeH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f5f9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(timeText, timeX + timeW / 2, timeY + timeH / 2);
  }
  ctx.restore();
}
function drawRemoteCrosshair(ctx, bounds, x) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  if (x < padding.left || x > rightAxisX) return;
  ctx.save();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, padding.top);
  ctx.lineTo(Math.round(x) + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.restore();
}
function formatVolume(volume) {
  if (volume === void 0 || volume === null || isNaN(volume) || volume <= 0) return "-";
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toLocaleString();
}
function formatChange(open, close) {
  const diff = close - open;
  const pct = open > 0 ? diff / open * 100 : 0;
  const isBullish = diff >= 0;
  const sign = isBullish ? "+" : "";
  return {
    diff,
    pct,
    isBullish,
    text: `${sign}$${formatPrice(diff)} (${sign}${pct.toFixed(2)}%)`
  };
}

// src/engine/ruler.ts
function drawRulerOverlay(ctx, bounds, ruler) {
  if (!ruler.active || !ruler.startPoint || !ruler.currentPoint) return;
  const { startPoint, currentPoint } = ruler;
  const { padding, chartWidth, chartHeight } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const x1 = Math.max(padding.left, Math.min(rightAxisX, startPoint.x));
  const y1 = Math.max(padding.top, Math.min(bottomAxisY, startPoint.y));
  const x2 = Math.max(padding.left, Math.min(rightAxisX, currentPoint.x));
  const y2 = Math.max(padding.top, Math.min(bottomAxisY, currentPoint.y));
  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectW = Math.max(2, Math.abs(x2 - x1));
  const rectH = Math.max(2, Math.abs(y2 - y1));
  const priceDiff = currentPoint.price - startPoint.price;
  const pricePct = startPoint.price > 0 ? priceDiff / startPoint.price * 100 : 0;
  const barsCount = Math.abs(currentPoint.index - startPoint.index);
  const isPositive = priceDiff >= 0;
  const accentColor = isPositive ? "#10b981" : "#f43f5e";
  const bgFill = isPositive ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)";
  ctx.save();
  ctx.fillStyle = bgFill;
  ctx.fillRect(rectX, rectY, rectW, rectH);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rectX, rectY, rectW, rectH);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  const sign = isPositive ? "+" : "";
  const priceText = `${sign}$${formatPrice(priceDiff)} (${sign}${pricePct.toFixed(2)}%)`;
  const barsText = `${barsCount} bar${barsCount !== 1 ? "s" : ""}`;
  const fullText = `${priceText}  \u2022  ${barsText}`;
  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const textWidth = measureTextWidth(ctx, fullText);
  const badgeW = textWidth + 16;
  const badgeH = 22;
  let badgeX = x2 - badgeW / 2;
  let badgeY = y2 - badgeH - 12;
  if (badgeX < padding.left + 4) badgeX = padding.left + 4;
  if (badgeX + badgeW > rightAxisX - 4) badgeX = rightAxisX - badgeW - 4;
  if (badgeY < padding.top + 4) badgeY = y2 + 12;
  ctx.fillStyle = "rgba(2, 6, 22, 0.92)";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fullText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.restore();
}

// src/components/VortexChartControls.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var VortexChartControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  isZoomed,
  zoomLevel = 1,
  isRulerActive = false,
  onToggleRuler,
  className = ""
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: `absolute top-2.5 right-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-black/75 px-1.5 py-1 backdrop-blur-md shadow-xl transition-all duration-200 opacity-60 hover:opacity-100 ${className}`,
      role: "toolbar",
      "aria-label": "Contr\xF4les du graphique",
      children: [
        isZoomed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "mr-1 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-400/30", children: [
          zoomLevel,
          "x"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              onZoomIn();
            },
            title: "Zoom avant (+)",
            className: "flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400",
            "aria-label": "Zoom avant",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "svg",
              {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className: "h-3.5 w-3.5",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "11", cy: "11", r: "8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "11", y1: "8", x2: "11", y2: "14" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              onZoomOut();
            },
            title: "Zoom arri\xE8re (-)",
            className: "flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400",
            "aria-label": "Zoom arri\xE8re",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "svg",
              {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className: "h-3.5 w-3.5",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "11", cy: "11", r: "8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                ]
              }
            )
          }
        ),
        onToggleRuler && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              onToggleRuler();
            },
            title: isRulerActive ? "D\xE9sactiver l'outil de mesure" : "Outil de mesure (ou Shift+Glisser)",
            className: `flex h-6 w-6 items-center justify-center rounded transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 ${isRulerActive ? "bg-sky-500/25 text-sky-300 border border-sky-400/40" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`,
            "aria-label": "Outil de mesure",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "svg",
              {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className: "h-3.5 w-3.5",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "m14.5 12.5 2-2" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "m11.5 9.5 2-2" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "m8.5 6.5 2-2" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "m17.5 15.5 2-2" })
                ]
              }
            )
          }
        ),
        isZoomed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              onReset();
            },
            title: "R\xE9initialiser l'affichage (Double-clic)",
            className: "flex h-6 items-center gap-1 rounded bg-sky-500/15 border border-sky-400/30 px-1.5 text-[10px] font-medium text-sky-300 hover:bg-sky-500/30 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400",
            "aria-label": "R\xE9initialiser le zoom",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "svg",
                {
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  className: "h-3 w-3",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 3v5h5" })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Fit" })
            ]
          }
        )
      ]
    }
  );
};

// src/engine/canvas.ts
function setupCanvasDpi(canvas, width, height) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr };
}

// src/hooks/useChartSurface.ts
var import_react = require("react");
function useChartSurface() {
  const containerRef = (0, import_react.useRef)(null);
  const canvasRef = (0, import_react.useRef)(null);
  const overlayRef = (0, import_react.useRef)(null);
  const [containerWidth, setContainerWidth] = (0, import_react.useState)(600);
  const [dpr, setDpr] = (0, import_react.useState)(
    () => typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );
  (0, import_react.useEffect)(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth || 600);
    let raf = 0;
    let pendingWidth = 0;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && width !== pendingWidth) {
          pendingWidth = width;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => setContainerWidth(pendingWidth));
        }
      }
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dpr]);
  return { containerRef, canvasRef, overlayRef, containerWidth, dpr };
}

// src/hooks/useChartViewport.ts
var import_react2 = require("react");

// src/engine/viewport.ts
function createViewport(totalCount, minVisible = 8) {
  const safeCount = Math.max(0, totalCount);
  return {
    startIndex: 0,
    endIndex: Math.max(0, safeCount - 1),
    totalCount: safeCount,
    minVisible: Math.min(minVisible, Math.max(1, safeCount))
  };
}
function isViewportZoomed(viewport) {
  if (viewport.totalCount <= 0) return false;
  return viewport.startIndex > 0 || viewport.endIndex < viewport.totalCount - 1;
}
function getZoomLevel(viewport) {
  const visibleCount = getVisibleCount(viewport);
  if (visibleCount <= 0 || viewport.totalCount <= 0) return 1;
  const ratio = viewport.totalCount / visibleCount;
  return Math.round(ratio * 10) / 10;
}
function getVisibleCount(viewport) {
  if (viewport.totalCount <= 0) return 0;
  return Math.max(1, viewport.endIndex - viewport.startIndex + 1);
}
function zoomViewport(viewport, factor, anchorRatio = 0.5) {
  const { totalCount, minVisible, startIndex, endIndex } = viewport;
  if (totalCount <= minVisible) return viewport;
  const currentSpan = endIndex - startIndex + 1;
  const targetSpan = Math.round(currentSpan / factor);
  const newSpan = Math.max(minVisible, Math.min(totalCount, targetSpan));
  if (newSpan === currentSpan) return viewport;
  const spanDelta = newSpan - currentSpan;
  const clampedAnchor = Math.max(0, Math.min(1, anchorRatio));
  let newStart = Math.round(startIndex - spanDelta * clampedAnchor);
  let newEnd = newStart + newSpan - 1;
  if (newStart < 0) {
    newEnd += -newStart;
    newStart = 0;
  }
  if (newEnd >= totalCount) {
    const overflow = newEnd - (totalCount - 1);
    newStart = Math.max(0, newStart - overflow);
    newEnd = totalCount - 1;
  }
  return {
    ...viewport,
    startIndex: Math.max(0, newStart),
    endIndex: Math.min(totalCount - 1, newEnd)
  };
}
function panViewport(viewport, deltaBars) {
  const { totalCount, startIndex, endIndex } = viewport;
  if (totalCount <= 0 || deltaBars === 0) return viewport;
  const span = endIndex - startIndex + 1;
  let newStart = startIndex - deltaBars;
  let newEnd = newStart + span - 1;
  if (newStart < 0) {
    newStart = 0;
    newEnd = Math.min(totalCount - 1, span - 1);
  } else if (newEnd >= totalCount) {
    newEnd = totalCount - 1;
    newStart = Math.max(0, totalCount - span);
  }
  return {
    ...viewport,
    startIndex: newStart,
    endIndex: newEnd
  };
}
function resetViewport(totalCount, minVisible = 8) {
  return createViewport(totalCount, minVisible);
}
function createTailViewport(totalCount, visibleBars, minVisible = 8) {
  const base = createViewport(totalCount, minVisible);
  if (totalCount <= visibleBars) return base;
  const span = Math.max(1, visibleBars);
  return {
    ...base,
    startIndex: Math.max(0, totalCount - span),
    endIndex: totalCount - 1
  };
}
function followViewport(prev, totalCount) {
  if (prev.totalCount === totalCount) return prev;
  if (totalCount <= 0) return createViewport(0, prev.minVisible);
  const span = Math.max(1, prev.endIndex - prev.startIndex + 1);
  const endIndex = totalCount - 1;
  const startIndex = Math.max(0, endIndex - span + 1);
  return {
    ...prev,
    startIndex,
    endIndex,
    totalCount
  };
}

// src/hooks/useChartViewport.ts
function useChartViewport(totalCount, minVisible = 8, options = {}) {
  const { mode = "reset", initialVisibleBars } = options;
  const [viewport, setViewport] = (0, import_react2.useState)(
    () => initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible)
  );
  (0, import_react2.useEffect)(() => {
    setViewport((prev) => {
      if (prev.totalCount === totalCount) return prev;
      if (mode === "follow") return followViewport(prev, totalCount);
      return initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible);
    });
  }, [totalCount, minVisible, mode, initialVisibleBars]);
  const zoomIn = (0, import_react2.useCallback)(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);
  const zoomOut = (0, import_react2.useCallback)(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);
  const resetView = (0, import_react2.useCallback)(() => {
    setViewport(
      initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible)
    );
  }, [totalCount, minVisible, initialVisibleBars]);
  const pan = (0, import_react2.useCallback)((deltaBars) => {
    setViewport((prev) => panViewport(prev, deltaBars));
  }, []);
  return {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetView,
    pan,
    isZoomed: isViewportZoomed(viewport),
    zoomLevel: getZoomLevel(viewport)
  };
}

// src/hooks/useChartPointer.ts
var import_react3 = require("react");
var INACTIVE_RULER = { active: false, startPoint: null, currentPoint: null };
function useChartPointer({
  canvasRef,
  bounds,
  visible,
  slotCount,
  indexOffset = 0,
  timeScale = null,
  panZoom = false,
  viewport,
  onViewportChange
}) {
  const [hover, setHover] = (0, import_react3.useState)(null);
  const [ruler, setRuler] = (0, import_react3.useState)(INACTIVE_RULER);
  const [isRulerToolActive, setIsRulerToolActive] = (0, import_react3.useState)(false);
  const rafRef = (0, import_react3.useRef)(0);
  const dragRef = (0, import_react3.useRef)({
    isDragging: false,
    startX: 0,
    initialViewport: createInitialViewport()
  });
  function createInitialViewport() {
    return viewport ?? { startIndex: 0, endIndex: 0, totalCount: 0, minVisible: 1 };
  }
  const schedule = (0, import_react3.useCallback)((fn) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(fn);
  }, []);
  (0, import_react3.useEffect)(() => {
    setHover(null);
  }, [visible]);
  (0, import_react3.useEffect)(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setRuler(INACTIVE_RULER);
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  (0, import_react3.useEffect)(() => () => cancelAnimationFrame(rafRef.current), []);
  const boundsRef = (0, import_react3.useRef)(bounds);
  (0, import_react3.useEffect)(() => {
    boundsRef.current = bounds;
  });
  const viewportChangeRef = (0, import_react3.useRef)(onViewportChange);
  (0, import_react3.useEffect)(() => {
    viewportChangeRef.current = onViewportChange;
  });
  (0, import_react3.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panZoom) return;
    let wheelRaf = 0;
    let pending = null;
    const onWheel = (e) => {
      e.preventDefault();
      const b = boundsRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const anchorRatio = (mouseX - b.padding.left) / b.plotWidth;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      pending = { factor, anchorRatio };
      if (wheelRaf) return;
      wheelRaf = requestAnimationFrame(() => {
        wheelRaf = 0;
        const p = pending;
        pending = null;
        if (!p) return;
        const next = zoomViewportByAnchor(p.factor, p.anchorRatio);
        liveViewportRef.current = next;
        viewportChangeRef.current?.(next);
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(wheelRaf);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [canvasRef, panZoom]);
  const liveViewportRef = (0, import_react3.useRef)(viewport);
  (0, import_react3.useEffect)(() => {
    liveViewportRef.current = viewport;
  });
  function zoomViewportByAnchor(factor, anchorRatio) {
    return zoomViewport(liveViewportRef.current ?? createInitialViewport(), factor, anchorRatio);
  }
  const hitTest = (mouseX, mouseY) => {
    const count = slotCount ?? visible.length;
    let localIdx;
    if (timeScale && visible.length > 0) {
      localIdx = nearestTimeIndex(visible, xToTime(mouseX, timeScale, bounds));
    } else {
      localIdx = xToIndex(mouseX, count, bounds);
    }
    if (localIdx < 0) {
      const centerX = bounds.padding.left + bounds.plotWidth / 2;
      return { candle: null, snapX: centerX, price: yToPrice(mouseY, bounds), globalIndex: -1 };
    }
    const candle = visible[localIdx] ?? null;
    const snapX = Math.round(
      timeScale && candle ? timeToX(candle.t, timeScale, bounds) : indexToX(localIdx, count, bounds)
    );
    const price = yToPrice(mouseY, bounds);
    const globalIndex = indexOffset + localIdx;
    return { candle, snapX, price, globalIndex };
  };
  const handlePointerDown = (e) => {
    if (visible.length === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { candle, price, globalIndex } = hitTest(mouseX, mouseY);
    if (e.shiftKey || isRulerToolActive) {
      const point = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      setRuler({ active: true, startPoint: point, currentPoint: point });
      return;
    }
    if (panZoom && viewport && onViewportChange) {
      canvas.setPointerCapture?.(e.pointerId);
      dragRef.current = { isDragging: true, startX: mouseX, initialViewport: viewport };
    }
  };
  const handlePointerMove = (e) => {
    if (visible.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { candle, snapX, price, globalIndex } = hitTest(mouseX, mouseY);
    if (ruler.active && ruler.startPoint) {
      const point = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      schedule(() => setRuler((prev) => ({ ...prev, currentPoint: point })));
      return;
    }
    if (dragRef.current.isDragging && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX;
      const barWidth = bounds.plotWidth / Math.max(1, slotCount ?? visible.length);
      const deltaBars = Math.round(deltaX / barWidth);
      const nextViewport = panViewport(dragRef.current.initialViewport, deltaBars);
      schedule(() => {
        onViewportChange(nextViewport);
        setHover(null);
      });
      return;
    }
    schedule(() => setHover({ mouseX, mouseY, snapX, index: globalIndex, candle }));
  };
  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
  };
  const handlePointerCancel = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };
  const handlePointerLeave = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };
  const toggleRuler = (0, import_react3.useCallback)(() => {
    setIsRulerToolActive((prev) => {
      if (prev) setRuler(INACTIVE_RULER);
      return !prev;
    });
  }, []);
  const clearRuler = (0, import_react3.useCallback)(() => {
    setRuler(INACTIVE_RULER);
    setIsRulerToolActive(false);
  }, []);
  return {
    hover,
    ruler,
    isRulerToolActive,
    toggleRuler,
    clearRuler,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave
    }
  };
}

// src/hooks/useCrosshairSync.ts
var import_react4 = require("react");

// src/engine/crosshair-sync.ts
var groups = /* @__PURE__ */ new Map();
function subscribeCrosshairSync(group, listener) {
  let listeners = groups.get(group);
  if (!listeners) {
    listeners = /* @__PURE__ */ new Set();
    groups.set(group, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) groups.delete(group);
  };
}
function publishCrosshairSync(group, event) {
  const listeners = groups.get(group);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(event);
  }
}

// src/hooks/useCrosshairSync.ts
function useCrosshairSync({ group, localTime, onRemoteTime }) {
  const sourceId = (0, import_react4.useId)();
  const onRemoteRef = (0, import_react4.useRef)(onRemoteTime);
  (0, import_react4.useEffect)(() => {
    onRemoteRef.current = onRemoteTime;
  });
  (0, import_react4.useEffect)(() => {
    if (!group) return;
    publishCrosshairSync(group, { time: localTime, sourceId });
  }, [group, localTime, sourceId]);
  (0, import_react4.useEffect)(() => {
    if (!group) return;
    return subscribeCrosshairSync(group, (event) => {
      if (event.sourceId !== sourceId) {
        onRemoteRef.current(event.time);
      }
    });
  }, [group, sourceId]);
  return { sourceId };
}

// src/components/VortexCandleChart.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var EMPTY_COLORS = {};
var VortexCandleChart = ({
  candles,
  priceLines = [],
  swingHigh,
  swingLow,
  spotPrice,
  atrBounds,
  height = 300,
  className = "",
  isIntraday = false,
  showWatermark = true,
  showControls = true,
  timeScale = false,
  crosshairSyncGroup,
  zones,
  viewportMode = "reset",
  initialVisibleBars,
  timeZone,
  theme = {}
}) => {
  const sortedCandles = (0, import_react5.useMemo)(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const { viewport, setViewport, zoomIn, zoomOut, resetView, isZoomed, zoomLevel } = useChartViewport(sortedCandles.length, 6, {
    mode: viewportMode,
    initialVisibleBars
  });
  const mergedColors = (0, import_react5.useMemo)(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS }),
    [theme.colors]
  );
  const visibleCandles = (0, import_react5.useMemo)(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);
  const bounds = (0, import_react5.useMemo)(() => {
    const prices = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));
    const lines = [...priceLines];
    if (typeof swingHigh === "number" && swingHigh > 0) {
      prices.push(swingHigh);
      lines.push({
        price: swingHigh,
        color: mergedColors.bearish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D High $${formatPrice(swingHigh)}`,
        axisLabelVisible: true
      });
    }
    if (typeof swingLow === "number" && swingLow > 0) {
      prices.push(swingLow);
      lines.push({
        price: swingLow,
        color: mergedColors.bullish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D Low $${formatPrice(swingLow)}`,
        axisLabelVisible: true
      });
    }
    if (typeof spotPrice === "number" && spotPrice > 0) {
      prices.push(spotPrice);
      lines.push({
        price: spotPrice,
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        title: `Spot $${formatPrice(spotPrice)}`,
        axisLabelVisible: true
      });
    }
    if (atrBounds?.upper && atrBounds.upper > 0) {
      prices.push(atrBounds.upper);
      lines.push({
        price: atrBounds.upper,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Upper",
        axisLabelVisible: false
      });
    }
    if (atrBounds?.lower && atrBounds.lower > 0) {
      prices.push(atrBounds.lower);
      lines.push({
        price: atrBounds.lower,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Lower",
        axisLabelVisible: false
      });
    }
    return { computed: computeBounds(prices, containerWidth, height), lines };
  }, [visibleCandles, priceLines, swingHigh, swingLow, spotPrice, atrBounds, mergedColors, containerWidth, height]);
  const chartBounds = bounds.computed;
  const allLines = bounds.lines;
  const timeScaleMapping = (0, import_react5.useMemo)(() => {
    if (!timeScale || visibleCandles.length < 2) return null;
    const tMin = visibleCandles[0].t;
    const tMax = visibleCandles[visibleCandles.length - 1].t;
    return tMax > tMin ? { tMin, tMax } : null;
  }, [timeScale, visibleCandles]);
  const timeLabels = (0, import_react5.useMemo)(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));
    const labels = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = timeScaleMapping ? timeToX(c.t, timeScaleMapping, chartBounds) : indexToX(i, count, chartBounds);
      labels.push({ x, text: formatCandleTime(c.t, isIntraday, timeZone) });
    }
    return labels;
  }, [visibleCandles, containerWidth, chartBounds, isIntraday, timeScaleMapping, timeZone]);
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds: chartBounds,
    visible: visibleCandles,
    indexOffset: viewport.startIndex,
    timeScale: timeScaleMapping,
    panZoom: true,
    viewport,
    onViewportChange: setViewport
  });
  const [remoteHoverTime, setRemoteHoverTime] = (0, import_react5.useState)(null);
  useCrosshairSync({
    group: crosshairSyncGroup,
    localTime: hover?.candle?.t ?? null,
    onRemoteTime: setRemoteHoverTime
  });
  const handleReset = () => {
    resetView();
    clearRuler();
  };
  (0, import_react5.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, chartBounds, timeLabels);
    if (zones && zones.length > 0) {
      drawChartZones(ctx, chartBounds, zones, visibleCandles);
    }
    drawCandlesticks(
      ctx,
      visibleCandles,
      chartBounds,
      {
        upColor: mergedColors.bullish,
        downColor: mergedColors.bearish
      },
      timeScaleMapping
    );
    drawPriceLines(ctx, allLines, chartBounds);
    if (showWatermark) {
      drawVortexWatermark(ctx, chartBounds);
    }
  }, [containerWidth, height, dpr, chartBounds, visibleCandles, allLines, timeLabels, timeScaleMapping, zones, showWatermark, mergedColors, canvasRef]);
  (0, import_react5.useEffect)(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (ruler.active) {
      drawRulerOverlay(ctx, chartBounds, ruler);
    }
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, chartBounds, hover, formatCandleTime(hover.candle.t, isIntraday, timeZone));
    }
    if (!hover && remoteHoverTime != null && visibleCandles.length > 0) {
      const idx = nearestTimeIndex(visibleCandles, remoteHoverTime);
      const c = idx >= 0 ? visibleCandles[idx] : null;
      if (c) {
        const tSpan = visibleCandles[visibleCandles.length - 1].t - visibleCandles[0].t;
        const avgGap = tSpan / Math.max(1, visibleCandles.length - 1);
        if (Math.abs(c.t - remoteHoverTime) <= Math.max(avgGap, 6e4)) {
          const x = timeScaleMapping ? timeToX(c.t, timeScaleMapping, chartBounds) : indexToX(idx, visibleCandles.length, chartBounds);
          drawRemoteCrosshair(ctx, chartBounds, x);
        }
      }
    }
  }, [containerWidth, height, dpr, chartBounds, hover, ruler, remoteHoverTime, visibleCandles, timeScaleMapping, isIntraday, timeZone, overlayRef]);
  const hoverMetrics = (0, import_react5.useMemo)(() => {
    if (!hover?.candle) return null;
    const change = formatChange(hover.candle.open, hover.candle.close);
    const vol = formatVolume(hover.candle.volume);
    return { ...change, volumeStr: vol };
  }, [hover]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            onDoubleClick: handleReset,
            className: `block h-full w-full ${ruler.active || isRulerToolActive ? "cursor-crosshair" : isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`,
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          VortexChartControls,
          {
            onZoomIn: zoomIn,
            onZoomOut: zoomOut,
            onReset: handleReset,
            isZoomed,
            zoomLevel,
            isRulerActive: isRulerToolActive || ruler.active,
            onToggleRuler: toggleRuler
          }
        ),
        hover && hover.candle && !ruler.active && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, isIntraday, timeZone) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "text-zinc-500 font-normal", children: "O: " }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.open)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "text-zinc-500 font-normal", children: "H: " }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.high)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "text-zinc-500 font-normal", children: "L: " }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.low)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "text-zinc-500 font-normal", children: "C: " }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "span",
              {
                className: `font-bold ${hover.candle.close >= hover.candle.open ? "text-emerald-400" : "text-rose-400"}`,
                children: [
                  "$",
                  formatPrice(hover.candle.close)
                ]
              }
            )
          ] }),
          hoverMetrics && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "span",
              {
                className: `font-medium ${hoverMetrics.isBullish ? "text-emerald-400" : "text-rose-400"}`,
                children: hoverMetrics.text
              }
            ),
            hoverMetrics.volumeStr !== "-" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-3 w-px bg-white/15" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "text-zinc-400", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "text-zinc-500 font-normal", children: "Vol: " }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-zinc-200", children: hoverMetrics.volumeStr })
              ] })
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexRangeChart.tsx
var import_react6 = require("react");

// src/engine/boxes.ts
function drawSessionBox(ctx, box, bounds) {
  if (box.high <= 0 || box.low <= 0) return;
  const { chartWidth, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const yHigh = Math.round(priceToY(box.high, bounds));
  const yLow = Math.round(priceToY(box.low, bounds));
  const yMid = Math.round(priceToY(box.mid, bounds));
  ctx.save();
  ctx.fillStyle = box.fillColor || "rgba(234, 179, 8, 0.04)";
  ctx.fillRect(padding.left, yHigh, rightAxisX - padding.left, yLow - yHigh);
  ctx.strokeStyle = box.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, yHigh + 0.5);
  ctx.lineTo(rightAxisX, yHigh + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, yLow + 0.5);
  ctx.lineTo(rightAxisX, yLow + 0.5);
  ctx.stroke();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = box.color;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(padding.left, yMid + 0.5);
  ctx.lineTo(rightAxisX, yMid + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.font = "bold 9px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const highText = `${box.prefix}H $${formatPrice(box.high)}`;
  const highW = measureTextWidth(ctx, highText) + 8;
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(rightAxisX + 3, yHigh - 7, highW, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.fillText(highText, rightAxisX + 3 + highW / 2, yHigh);
  const lowText = `${box.prefix}L $${formatPrice(box.low)}`;
  const lowW = measureTextWidth(ctx, lowText) + 8;
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(rightAxisX + 3, yLow - 7, lowW, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.fillText(lowText, rightAxisX + 3 + lowW / 2, yLow);
  ctx.restore();
}

// src/engine/lines.ts
function drawLineSeries(ctx, points, bounds, options) {
  if (points.length < 2) return;
  const { chartHeight, padding } = bounds;
  const bottomAxisY = chartHeight - padding.bottom;
  ctx.save();
  if (options.fillGradient) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, bottomAxisY);
    gradient.addColorStop(0, options.gradientColorTop || "rgba(56, 189, 248, 0.20)");
    gradient.addColorStop(1, options.gradientColorBottom || "rgba(56, 189, 248, 0.00)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, bottomAxisY);
    points.forEach((pt) => {
      const y = priceToY(pt.price, bounds);
      ctx.lineTo(pt.x, y);
    });
    ctx.lineTo(points[points.length - 1].x, bottomAxisY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth ?? 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (options.lineStyle === "dashed") {
    ctx.setLineDash([5, 4]);
  } else if (options.lineStyle === "dotted") {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  points.forEach((pt, idx) => {
    const y = priceToY(pt.price, bounds);
    if (idx === 0) {
      ctx.moveTo(pt.x, y);
    } else {
      ctx.lineTo(pt.x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
}

// src/components/VortexRangeChart.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var EMPTY_COLORS2 = {};
var VortexRangeChart = ({
  candles,
  priorDay,
  premarket,
  vwapSeries = [],
  overlayMode = "all",
  height = 300,
  className = "",
  showWatermark = true,
  showControls = true,
  crosshairSyncGroup,
  theme = {}
}) => {
  const sortedCandles = (0, import_react6.useMemo)(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const { viewport, setViewport, zoomIn, zoomOut, resetView, isZoomed, zoomLevel } = useChartViewport(sortedCandles.length, 12);
  const mergedColors = (0, import_react6.useMemo)(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS2 }),
    [theme.colors]
  );
  const visibleCandles = (0, import_react6.useMemo)(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);
  const bounds = (0, import_react6.useMemo)(() => {
    const prices = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));
    if (priorDay && priorDay.high > 0) prices.push(priorDay.high, priorDay.low);
    if (premarket && premarket.high > 0) prices.push(premarket.high, premarket.low);
    vwapSeries.forEach((v) => {
      if (typeof v.vwap === "number" && v.vwap > 0) prices.push(v.vwap);
    });
    return computeBounds(prices, containerWidth, height);
  }, [visibleCandles, priorDay, premarket, vwapSeries, containerWidth, height]);
  const timeLabels = (0, import_react6.useMemo)(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));
    const labels = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(i, count, bounds);
      labels.push({ x, text: formatCandleTime(c.t, true) });
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds]);
  const vwapPoints = (0, import_react6.useMemo)(() => {
    if (vwapSeries.length === 0 || visibleCandles.length === 0) return [];
    const points = [];
    const count = visibleCandles.length;
    vwapSeries.forEach((v) => {
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < count; i++) {
        const diff = Math.abs(visibleCandles[i].t - v.t);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      if (closestIdx >= 0 && minDiff < 1e3 * 60 * 30) {
        const x = indexToX(closestIdx, count, bounds);
        points.push({ x, price: v.vwap });
      }
    });
    return points;
  }, [vwapSeries, visibleCandles, bounds]);
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds,
    visible: visibleCandles,
    indexOffset: viewport.startIndex,
    panZoom: true,
    viewport,
    onViewportChange: setViewport
  });
  const [remoteHoverTime, setRemoteHoverTime] = (0, import_react6.useState)(null);
  useCrosshairSync({
    group: crosshairSyncGroup,
    localTime: hover?.candle?.t ?? null,
    onRemoteTime: setRemoteHoverTime
  });
  const handleReset = () => {
    resetView();
    clearRuler();
  };
  (0, import_react6.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds, timeLabels);
    const showBoxes = overlayMode === "all" || overlayMode === "boxes";
    const showVwap = overlayMode === "all" || overlayMode === "vwap";
    if (showBoxes && priorDay && priorDay.high > 0) {
      drawSessionBox(
        ctx,
        {
          high: priorDay.high,
          low: priorDay.low,
          mid: priorDay.mid,
          color: "rgba(234, 179, 8, 0.85)",
          fillColor: "rgba(234, 179, 8, 0.035)",
          prefix: "PD"
        },
        bounds
      );
    }
    if (showBoxes && premarket && premarket.high > 0) {
      drawSessionBox(
        ctx,
        {
          high: premarket.high,
          low: premarket.low,
          mid: premarket.mid,
          color: "rgba(56, 189, 248, 0.85)",
          fillColor: "rgba(56, 189, 248, 0.035)",
          prefix: "PM"
        },
        bounds
      );
    }
    drawCandlesticks(ctx, visibleCandles, bounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish
    });
    if (showVwap && vwapPoints.length > 1) {
      drawLineSeries(ctx, vwapPoints, bounds, {
        color: mergedColors.vwap,
        lineWidth: 2,
        lineStyle: "solid"
      });
    }
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, dpr, bounds, visibleCandles, priorDay, premarket, vwapPoints, overlayMode, timeLabels, showWatermark, mergedColors, canvasRef]);
  (0, import_react6.useEffect)(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, bounds, hover, formatCandleTime(hover.candle.t, true));
    }
    if (!hover && remoteHoverTime != null && visibleCandles.length > 0) {
      const idx = nearestTimeIndex(visibleCandles, remoteHoverTime);
      const c = idx >= 0 ? visibleCandles[idx] : null;
      if (c) {
        const tSpan = visibleCandles[visibleCandles.length - 1].t - visibleCandles[0].t;
        const avgGap = tSpan / Math.max(1, visibleCandles.length - 1);
        if (Math.abs(c.t - remoteHoverTime) <= Math.max(avgGap, 6e4)) {
          const x = indexToX(idx, visibleCandles.length, bounds);
          drawRemoteCrosshair(ctx, bounds, x);
        }
      }
    }
  }, [containerWidth, height, dpr, bounds, hover, ruler, remoteHoverTime, visibleCandles, overlayRef]);
  const hoverMetrics = (0, import_react6.useMemo)(() => {
    if (!hover?.candle) return null;
    const change = formatChange(hover.candle.open, hover.candle.close);
    const vol = formatVolume(hover.candle.volume);
    return { ...change, volumeStr: vol };
  }, [hover]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            onDoubleClick: handleReset,
            className: `block h-full w-full ${ruler.active || isRulerToolActive ? "cursor-crosshair" : isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`,
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          VortexChartControls,
          {
            onZoomIn: zoomIn,
            onZoomOut: zoomOut,
            onReset: handleReset,
            isZoomed,
            zoomLevel,
            isRulerActive: isRulerToolActive || ruler.active,
            onToggleRuler: toggleRuler
          }
        ),
        hover && hover.candle && !ruler.active && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, true) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "text-zinc-500 font-normal", children: "O: " }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.open)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "text-zinc-500 font-normal", children: "H: " }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.high)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "text-zinc-500 font-normal", children: "L: " }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.low)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "text-zinc-500 font-normal", children: "C: " }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
              "span",
              {
                className: `font-bold ${hover.candle.close >= hover.candle.open ? "text-emerald-400" : "text-rose-400"}`,
                children: [
                  "$",
                  formatPrice(hover.candle.close)
                ]
              }
            )
          ] }),
          hoverMetrics && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "span",
              {
                className: `font-medium ${hoverMetrics.isBullish ? "text-emerald-400" : "text-rose-400"}`,
                children: hoverMetrics.text
              }
            ),
            hoverMetrics.volumeStr !== "-" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "h-3 w-px bg-white/15" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-zinc-400", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { className: "text-zinc-500 font-normal", children: "Vol: " }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-zinc-200", children: hoverMetrics.volumeStr })
              ] })
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexConeChart.tsx
var import_react7 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var EMPTY_COLORS3 = {};
var VortexConeChart = ({
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
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const mergedColors = (0, import_react7.useMemo)(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS3 }),
    [theme.colors]
  );
  const resolvedCandles = (0, import_react7.useMemo)(() => {
    const raw = candles || historicalCandles || [];
    return Array.from(
      new Map(raw.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles, historicalCandles]);
  const resolvedSpot = spotPrice ?? currentPrice ?? (resolvedCandles.length > 0 ? resolvedCandles[resolvedCandles.length - 1].close : 0);
  const resolvedHigh = rangeHigh ?? targetRange?.high ?? (expectedMove ? resolvedSpot + expectedMove.moveAbs : 0);
  const resolvedLow = rangeLow ?? targetRange?.low ?? (expectedMove ? resolvedSpot - expectedMove.moveAbs : 0);
  const resolvedExpDate = expirationDate || expectedMove?.expiration || "Expiry";
  const resolvedDte = dte ?? expectedMove?.dte ?? 1;
  const futureStepCount = Math.max(2, Math.min(6, resolvedDte));
  const totalSlots = resolvedCandles.length + futureStepCount;
  const bounds = (0, import_react7.useMemo)(() => {
    const prices = [];
    resolvedCandles.forEach((c) => prices.push(c.close));
    if (resolvedSpot > 0) prices.push(resolvedSpot);
    if (resolvedHigh > 0) prices.push(resolvedHigh);
    if (resolvedLow > 0) prices.push(resolvedLow);
    return computeBounds(prices, containerWidth, height);
  }, [resolvedCandles, resolvedSpot, resolvedHigh, resolvedLow, containerWidth, height]);
  const histPoints = (0, import_react7.useMemo)(() => {
    return resolvedCandles.map((c, idx) => ({
      x: indexToX(idx, totalSlots, bounds),
      price: c.close
    }));
  }, [resolvedCandles, totalSlots, bounds]);
  const timeLabels = (0, import_react7.useMemo)(() => {
    if (resolvedCandles.length === 0) return [];
    const labels = [];
    const maxHistLabels = Math.max(2, Math.floor(containerWidth / 150));
    const step = Math.max(1, Math.floor(resolvedCandles.length / maxHistLabels));
    for (let i = 0; i < resolvedCandles.length; i += step) {
      const c = resolvedCandles[i];
      const x = indexToX(i, totalSlots, bounds);
      labels.push({ x, text: formatCandleTime(c.t, false) });
    }
    const expiryX = indexToX(totalSlots - 1, totalSlots, bounds);
    labels.push({ x: expiryX, text: resolvedExpDate });
    return labels;
  }, [resolvedCandles, totalSlots, bounds, containerWidth, resolvedExpDate]);
  const priceLines = (0, import_react7.useMemo)(() => {
    const list = [];
    if (resolvedHigh > 0) {
      list.push({
        price: resolvedHigh,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: "dotted",
        title: `Upper Target $${formatPrice(resolvedHigh)}`,
        axisLabelVisible: true
      });
    }
    if (resolvedLow > 0) {
      list.push({
        price: resolvedLow,
        color: mergedColors.neutral,
        lineWidth: 1,
        lineStyle: "dotted",
        title: `Lower Target $${formatPrice(resolvedLow)}`,
        axisLabelVisible: true
      });
    }
    if (resolvedSpot > 0) {
      list.push({
        price: resolvedSpot,
        color: mergedColors.spot,
        lineWidth: 1,
        lineStyle: "solid",
        title: `Spot $${formatPrice(resolvedSpot)}`,
        axisLabelVisible: true
      });
    }
    return list;
  }, [resolvedHigh, resolvedLow, resolvedSpot, mergedColors]);
  const { hover, ruler, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds,
    visible: resolvedCandles,
    // Hit-testing spans history + future projection slots
    slotCount: totalSlots,
    panZoom: false
  });
  (0, import_react7.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds, timeLabels);
    if (histPoints.length > 1) {
      drawLineSeries(ctx, histPoints, bounds, {
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        fillGradient: true,
        gradientColorTop: "rgba(56, 189, 248, 0.18)",
        gradientColorBottom: "rgba(56, 189, 248, 0.00)"
      });
    }
    if (histPoints.length > 0 && resolvedHigh > 0 && resolvedLow > 0) {
      const lastPoint = histPoints[histPoints.length - 1];
      const expiryX = indexToX(totalSlots - 1, totalSlots, bounds);
      drawLineSeries(
        ctx,
        [
          { x: lastPoint.x, price: resolvedSpot },
          { x: expiryX, price: resolvedHigh }
        ],
        bounds,
        {
          color: mergedColors.neutral,
          lineWidth: 1.5,
          lineStyle: "dashed"
        }
      );
      drawLineSeries(
        ctx,
        [
          { x: lastPoint.x, price: resolvedSpot },
          { x: expiryX, price: resolvedLow }
        ],
        bounds,
        {
          color: mergedColors.neutral,
          lineWidth: 1.5,
          lineStyle: "dashed"
        }
      );
    }
    drawPriceLines(ctx, priceLines, bounds);
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, dpr, bounds, histPoints, resolvedSpot, resolvedHigh, resolvedLow, totalSlots, priceLines, timeLabels, showWatermark, mergedColors, canvasRef]);
  (0, import_react7.useEffect)(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }
    if (hover && hover.candle && !ruler.active) {
      drawCrosshair(ctx, bounds, hover, formatCandleTime(hover.candle.t, false));
    }
  }, [containerWidth, height, dpr, bounds, hover, ruler, overlayRef]);
  const spotDiff = (0, import_react7.useMemo)(() => {
    if (!hover?.candle || resolvedSpot <= 0) return null;
    const diff = hover.candle.close - resolvedSpot;
    const pct = diff / resolvedSpot * 100;
    const isBullish = diff >= 0;
    const sign = isBullish ? "+" : "";
    return {
      text: `${sign}$${formatPrice(diff)} (${sign}${pct.toFixed(2)}% vs Spot)`,
      isBullish
    };
  }, [hover, resolvedSpot]);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            className: "cursor-crosshair block h-full w-full",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        hover && hover.candle && !ruler.active && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, false) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { className: "text-zinc-500 font-normal", children: "Close: " }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "font-bold text-sky-400", children: [
              "$",
              formatPrice(hover.candle.close)
            ] })
          ] }),
          spotDiff && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "span",
              {
                className: `font-medium ${spotDiff.isBullish ? "text-emerald-400" : "text-rose-400"}`,
                children: spotDiff.text
              }
            )
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexBarChart.tsx
var import_react8 = require("react");

// src/engine/bars.ts
function computeBarBounds(data, width, height, symmetric, padding = DEFAULT_PADDING) {
  let maxAbs = 0;
  let min = 0;
  let max = 0;
  for (const d of data) {
    for (const v of [d.value, d.value2, d.overlay]) {
      if (typeof v !== "number" || !isFinite(v)) continue;
      const a = Math.abs(v);
      if (a > maxAbs) maxAbs = a;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  maxAbs = maxAbs > 0 ? maxAbs * 1.08 : 1;
  const minPrice = symmetric ? -maxAbs : min < 0 ? min * 1.08 : 0;
  const maxPrice = symmetric ? maxAbs : max > 0 ? max * 1.08 : 0;
  const span = maxPrice - minPrice || 1;
  return {
    minPrice,
    maxPrice,
    priceRange: span,
    chartWidth: width,
    chartHeight: height,
    plotWidth: Math.max(width - padding.left - padding.right, 10),
    plotHeight: Math.max(height - padding.top - padding.bottom, 10),
    padding
  };
}
function thinLabels(count, plotWidth, minGapPx = 56) {
  const visible = new Array(count).fill(false);
  if (count === 0) return visible;
  const maxLabels = Math.max(1, Math.floor(plotWidth / minGapPx));
  if (count <= maxLabels) {
    return visible.fill(true);
  }
  const step = (count - 1) / (maxLabels - 1);
  for (let i = 0; i < maxLabels; i++) {
    visible[Math.round(i * step)] = true;
  }
  return visible;
}
function nearestDatumIndex(data, value) {
  if (data.length === 0) return -1;
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(data[i].x - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}
function drawBarChart(ctx, bounds, data, options) {
  if (data.length === 0) return;
  const { chartWidth, chartHeight, plotWidth, plotHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const yZero = padding.top + plotHeight * (bounds.maxPrice / bounds.priceRange);
  const count = data.length;
  const slotWidth = plotWidth / count;
  const yOf = (value) => padding.top + plotHeight * (1 - (value - bounds.minPrice) / bounds.priceRange);
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillStyle = "#71717a";
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const step = bounds.priceRange / (options.tickCount + 1);
  for (let i = 1; i <= options.tickCount; i++) {
    const value = bounds.minPrice + i * step;
    if (Math.abs(value) < step * 0.01) continue;
    const y = Math.round(yOf(value));
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(rightAxisX, y + 0.5);
    ctx.stroke();
    ctx.fillText(options.formatValue(value), rightAxisX + 8, y);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, yZero + 0.5);
  ctx.lineTo(rightAxisX, yZero + 0.5);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.moveTo(rightAxisX + 0.5, padding.top);
  ctx.lineTo(rightAxisX + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, bottomAxisY + 0.5);
  ctx.lineTo(chartWidth, bottomAxisY + 0.5);
  ctx.stroke();
  const grouped = data.some((d) => typeof d.value2 === "number");
  const barCount = grouped ? 2 : 1;
  const barWidth = Math.max(2, Math.min(slotWidth * 0.72 / barCount, 28));
  const groupWidth = barCount === 1 ? barWidth : barWidth * 2 + 2;
  const gradPos = ctx.createLinearGradient(0, padding.top, 0, yZero);
  gradPos.addColorStop(0, options.posGlow);
  gradPos.addColorStop(1, hexToRgba(options.posColor, 0.25));
  const gradNeg = ctx.createLinearGradient(0, yZero, 0, bottomAxisY);
  gradNeg.addColorStop(0, options.negGlow);
  gradNeg.addColorStop(1, hexToRgba(options.negColor, 0.25));
  data.forEach((d, i) => {
    const cx = indexToX(i, count, bounds);
    const v1 = typeof d.value === "number" && isFinite(d.value) ? d.value : 0;
    const y1 = yOf(v1);
    const h1 = Math.abs(yZero - y1);
    ctx.fillStyle = options.valueColor ?? (v1 >= 0 ? gradPos : gradNeg);
    ctx.fillRect(Math.round(cx - groupWidth / 2), Math.min(y1, yZero), barWidth, Math.max(1, h1));
    if (grouped) {
      const v2 = typeof d.value2 === "number" && isFinite(d.value2) ? d.value2 : 0;
      const y2 = yOf(v2);
      const h2 = Math.abs(yZero - y2);
      ctx.fillStyle = options.value2Color ?? options.negColor;
      ctx.fillRect(Math.round(cx - groupWidth / 2 + barWidth + 2), Math.min(y2, yZero), barWidth, Math.max(1, h2));
    }
  });
  const overlayPoints = [];
  for (let i = 0; i < count; i++) {
    const overlay = data[i].overlay;
    if (typeof overlay === "number" && isFinite(overlay)) {
      overlayPoints.push({ x: indexToX(i, count, bounds), price: overlay });
    }
  }
  if (overlayPoints.length >= 2) {
    ctx.strokeStyle = options.overlayColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    overlayPoints.forEach((p, i) => {
      const y = yOf(p.price);
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    });
    ctx.stroke();
    ctx.fillStyle = options.overlayColor;
    overlayPoints.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, yOf(p.price), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  for (const ref of options.referenceLines) {
    const idx = nearestDatumIndex(data, ref.value);
    if (idx < 0) continue;
    const x = Math.round(indexToX(idx, count, bounds));
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = ref.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padding.top);
    ctx.lineTo(x + 0.5, yZero);
    ctx.stroke();
    ctx.setLineDash([]);
    const text = ref.label;
    const textW = measureTextWidth(ctx, text);
    const pillW = textW + 8;
    const pillX = Math.max(padding.left + 2, Math.min(rightAxisX - pillW - 2, x - pillW / 2));
    ctx.fillStyle = ref.color;
    ctx.beginPath();
    ctx.roundRect(pillX, padding.top - 14, pillW, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#020616";
    ctx.font = "bold 9px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, pillX + pillW / 2, padding.top - 8);
  }
  ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelVisible = thinLabels(count, plotWidth);
  data.forEach((d, i) => {
    if (!labelVisible[i] || !d.label) return;
    const x = indexToX(i, count, bounds);
    if (x < padding.left || x > rightAxisX) return;
    ctx.fillText(d.label, x, bottomAxisY + 7);
  });
  ctx.restore();
}
function drawBarHoverBand(ctx, bounds, index, count) {
  if (index < 0 || index >= count || count === 0) return;
  const { plotWidth, padding, chartHeight } = bounds;
  const bottomAxisY = chartHeight - padding.bottom;
  const slotWidth = plotWidth / count;
  const cx = indexToX(index, count, bounds);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(cx - slotWidth / 2, padding.top, slotWidth, bottomAxisY - padding.top);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(cx) + 0.5, padding.top);
  ctx.lineTo(Math.round(cx) + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.restore();
}
function hexToRgba(hex, alpha) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// src/components/VortexBarChart.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function formatCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return formatPrice(n);
}
var VortexBarChart = ({
  data,
  referenceLines = [],
  height = 300,
  className = "",
  posColor,
  negColor,
  posGlow,
  negGlow,
  valueColor,
  value2Color,
  overlayColor,
  formatValue = formatCompact,
  tickCount = 4,
  symmetric = true,
  tooltipContent,
  showWatermark = true
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const [hover, setHover] = (0, import_react8.useState)(null);
  const rafRef = (0, import_react8.useRef)(0);
  const merged = (0, import_react8.useMemo)(
    () => ({
      posColor: posColor ?? VORTEX_THEME.colors.bullish,
      negColor: negColor ?? VORTEX_THEME.colors.bearish,
      posGlow: posGlow ?? "#34d399",
      negGlow: negGlow ?? "#fb7185",
      overlayColor: overlayColor ?? VORTEX_THEME.colors.spot
    }),
    [posColor, negColor, posGlow, negGlow, overlayColor]
  );
  (0, import_react8.useEffect)(() => {
    setHover(null);
  }, [data]);
  (0, import_react8.useEffect)(() => () => cancelAnimationFrame(rafRef.current), []);
  const bounds = (0, import_react8.useMemo)(
    () => computeBarBounds(data, containerWidth, height, symmetric),
    [data, containerWidth, height, symmetric]
  );
  const options = (0, import_react8.useMemo)(
    () => ({
      ...merged,
      valueColor,
      value2Color,
      formatValue,
      tickCount,
      referenceLines
    }),
    [merged, valueColor, value2Color, formatValue, tickCount, referenceLines]
  );
  (0, import_react8.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawBarChart(ctx, bounds, data, options);
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, dpr, bounds, data, options, showWatermark, canvasRef]);
  (0, import_react8.useEffect)(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hover && data.length > 0) {
      drawBarHoverBand(ctx, bounds, hover.index, data.length);
    }
  }, [containerWidth, height, dpr, bounds, hover, data.length, overlayRef]);
  const handlePointerMove = (e) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const index = xToIndex(x, data.length, bounds);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setHover({ index, x, y }));
  };
  const handlePointerLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setHover(null);
  };
  const hoveredDatum = hover != null ? data[hover.index] : null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none ${className}`,
      style: { height },
      children: [
        data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex h-full items-center justify-center text-xs text-zinc-500", children: "No data available" }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "canvas",
            {
              ref: canvasRef,
              onPointerMove: handlePointerMove,
              onPointerLeave: handlePointerLeave,
              className: "block h-full w-full cursor-crosshair",
              style: { touchAction: "none" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" })
        ] }),
        hover && hoveredDatum && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "div",
          {
            className: "pointer-events-none absolute z-20",
            style: {
              left: Math.min(Math.max(hover.x + 12, 4), Math.max(containerWidth - 200, 4)),
              top: Math.max(hover.y - 12, 4),
              transform: hover.x > containerWidth - 220 ? "translateX(-100%)" : void 0
            },
            children: tooltipContent ? tooltipContent(hoveredDatum, hover.index) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-xl border border-white/10 bg-[#0b0c10]/95 p-3 shadow-2xl backdrop-blur-md", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "border-b border-white/10 pb-1 text-xs font-bold tabular-nums text-white", children: hoveredDatum.label || `$${formatPrice(hoveredDatum.x)}` }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-2 space-y-1 text-[11px] tabular-nums", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex justify-between gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-zinc-400", children: "Value:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    "span",
                    {
                      className: `font-bold ${hoveredDatum.value >= 0 ? "text-emerald-400" : "text-rose-400"}`,
                      children: formatValue(hoveredDatum.value)
                    }
                  )
                ] }),
                typeof hoveredDatum.value2 === "number" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex justify-between gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-zinc-400", children: "Secondary:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-bold text-rose-400", children: formatValue(hoveredDatum.value2) })
                ] }),
                typeof hoveredDatum.overlay === "number" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex justify-between gap-4 border-t border-white/10 pt-1", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-zinc-400", children: "Net:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "font-bold text-sky-300", children: formatValue(hoveredDatum.overlay) })
                ] })
              ] })
            ] })
          }
        )
      ]
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VORTEX_THEME,
  VortexBarChart,
  VortexCandleChart,
  VortexChartControls,
  VortexConeChart,
  VortexRangeChart,
  VortexWatermarkOverlay,
  computeBarBounds,
  computeZoneRect,
  createTailViewport,
  createViewport,
  drawBarChart,
  drawBarHoverBand,
  drawChartZones,
  drawRulerOverlay,
  drawVortexWatermark,
  followViewport,
  formatCandleTime,
  formatChange,
  formatPrice,
  formatVolume,
  getVisibleCount,
  getZoomLevel,
  isViewportZoomed,
  measureTextWidth,
  nearestDatumIndex,
  nearestTimeIndex,
  panViewport,
  parseZoneColor,
  publishCrosshairSync,
  resetViewport,
  subscribeCrosshairSync,
  thinLabels,
  timeToX,
  useChartPointer,
  useChartSurface,
  useChartViewport,
  useCrosshairSync,
  viewportIndexToX,
  viewportXToIndex,
  xToTime,
  zoomViewport
});
//# sourceMappingURL=index.cjs.map