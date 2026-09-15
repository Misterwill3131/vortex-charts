"use client";

// src/components/VortexCandleChart.tsx
import { useEffect as useEffect5, useMemo, useState as useState4 } from "react";

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
function computeBounds(prices, width, height, paddingOrScale, scaleOpt) {
  let padding = DEFAULT_PADDING;
  let verticalScale = scaleOpt;
  if (paddingOrScale) {
    if ("factor" in paddingOrScale || "offset" in paddingOrScale || "allowZeroOrNegative" in paddingOrScale) {
      verticalScale = paddingOrScale;
    } else {
      padding = paddingOrScale;
    }
  }
  const allowZero = verticalScale?.allowZeroOrNegative ?? false;
  const validPrices = prices.filter(
    (p) => typeof p === "number" && !isNaN(p) && isFinite(p) && (allowZero || p > 0)
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
    if (min === 0) {
      min = -1;
      max = 1;
    } else if (min > 0) {
      min *= 0.98;
      max *= 1.02;
    } else {
      min *= 1.02;
      max *= 0.98;
    }
  }
  const span = max - min;
  const pad = Math.max(span * 0.08, 0.5);
  let minPrice = min - pad;
  let maxPrice = max + pad;
  if (verticalScale) {
    const factor = Math.max(0.05, Math.min(50, verticalScale.factor ?? 1));
    const offset = verticalScale.offset ?? 0;
    const baseSpan = maxPrice - minPrice;
    const scaledSpan = baseSpan / factor;
    const mid = (minPrice + maxPrice) / 2 + offset;
    minPrice = mid - scaledSpan / 2;
    maxPrice = mid + scaledSpan / 2;
  }
  const priceRange = Math.max(maxPrice - minPrice, 1e-4);
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
function drawGridAndAxes(ctx, bounds, timeLabels = [], tickCount = 5) {
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
function drawCandlesticks(ctx, candles, bounds, style = DEFAULT_CANDLE_STYLE, timeScale, slotOffset = 0, slotCount) {
  if (candles.length === 0) return;
  const count = slotCount ?? candles.length;
  const xOf = (idx) => timeScale ? timeToX(candles[idx].t, timeScale, bounds) : indexToX(slotOffset + idx, count, bounds);
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
    if (x < bounds.padding.left - 25 || x > bounds.chartWidth - bounds.padding.right + 25) {
      return;
    }
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
import { jsx, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `pointer-events-none absolute bottom-6 left-4 z-10 flex items-baseline font-sans text-xs opacity-50 transition-opacity duration-200 hover:opacity-90 select-none ${className}`,
      "aria-label": "VorteXbot.app",
      children: [
        /* @__PURE__ */ jsx("span", { className: "font-bold tracking-tight text-white", children: "VorteX" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-sky-400", children: "bot.app" })
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
function drawGenericCrosshair(ctx, bounds, options) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const {
    mouseX,
    mouseY,
    snapX = mouseX,
    snapY = mouseY,
    xLabel,
    yLabel,
    color = "#38bdf8",
    showSnapDot = true
  } = options;
  if (snapX < padding.left || snapX > rightAxisX || snapY < padding.top || snapY > bottomAxisY) {
    return;
  }
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(snapX) + 0.5, padding.top);
  ctx.lineTo(Math.round(snapX) + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, Math.round(snapY) + 0.5);
  ctx.lineTo(rightAxisX, Math.round(snapY) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  if (showSnapDot) {
    ctx.beginPath();
    ctx.arc(snapX, snapY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(snapX, snapY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (yLabel) {
    ctx.font = "bold 10px Inter, monospace";
    const textW = measureTextWidth(ctx, yLabel);
    const pillW = textW + 10;
    const pillH = 16;
    const pillX = rightAxisX + 4;
    const pillY = Math.round(snapY - pillH / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(pillX, pillY, pillW, pillH, 3);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.fillStyle = "#020616";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(yLabel, pillX + pillW / 2, pillY + pillH / 2);
  }
  if (xLabel) {
    ctx.font = "10px Inter, monospace";
    const timeW = measureTextWidth(ctx, xLabel) + 12;
    const timeH = 16;
    const timeX = Math.round(snapX - timeW / 2);
    const timeY = bottomAxisY + 4;
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(timeX, timeY, timeW, timeH, 3);
    } else {
      ctx.rect(timeX, timeY, timeW, timeH);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f5f9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(xLabel, timeX + timeW / 2, timeY + timeH / 2);
  }
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
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      className: `absolute top-2.5 right-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-black/75 px-1.5 py-1 backdrop-blur-md shadow-xl transition-all duration-200 opacity-60 hover:opacity-100 ${className}`,
      role: "toolbar",
      "aria-label": "Contr\xF4les du graphique",
      children: [
        isZoomed && /* @__PURE__ */ jsx2("span", { className: "mr-1 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-400/30", children: typeof zoomLevel === "number" ? `${zoomLevel}x` : zoomLevel }),
        /* @__PURE__ */ jsx2(
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
            children: /* @__PURE__ */ jsxs2(
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
                  /* @__PURE__ */ jsx2("circle", { cx: "11", cy: "11", r: "8" }),
                  /* @__PURE__ */ jsx2("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                  /* @__PURE__ */ jsx2("line", { x1: "11", y1: "8", x2: "11", y2: "14" }),
                  /* @__PURE__ */ jsx2("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsx2(
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
            children: /* @__PURE__ */ jsxs2(
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
                  /* @__PURE__ */ jsx2("circle", { cx: "11", cy: "11", r: "8" }),
                  /* @__PURE__ */ jsx2("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                  /* @__PURE__ */ jsx2("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                ]
              }
            )
          }
        ),
        onToggleRuler && /* @__PURE__ */ jsx2(
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
            children: /* @__PURE__ */ jsxs2(
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
                  /* @__PURE__ */ jsx2("path", { d: "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" }),
                  /* @__PURE__ */ jsx2("path", { d: "m14.5 12.5 2-2" }),
                  /* @__PURE__ */ jsx2("path", { d: "m11.5 9.5 2-2" }),
                  /* @__PURE__ */ jsx2("path", { d: "m8.5 6.5 2-2" }),
                  /* @__PURE__ */ jsx2("path", { d: "m17.5 15.5 2-2" })
                ]
              }
            )
          }
        ),
        isZoomed && /* @__PURE__ */ jsxs2(
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
              /* @__PURE__ */ jsxs2(
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
                    /* @__PURE__ */ jsx2("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
                    /* @__PURE__ */ jsx2("path", { d: "M3 3v5h5" })
                  ]
                }
              ),
              /* @__PURE__ */ jsx2("span", { children: "Fit" })
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
import { useEffect, useRef, useState } from "react";
function useChartSurface() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [dpr, setDpr] = useState(
    () => typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );
  useEffect(() => {
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
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dpr]);
  return { containerRef, canvasRef, overlayRef, containerWidth, dpr };
}

// src/hooks/useChartViewport.ts
import { useCallback, useEffect as useEffect2, useState as useState2 } from "react";

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
function panViewport(viewport, deltaBars, allowOverscroll = false) {
  const { totalCount, startIndex, endIndex } = viewport;
  if (totalCount <= 0 || deltaBars === 0) return viewport;
  const span = endIndex - startIndex + 1;
  let newStart = startIndex - deltaBars;
  let newEnd = newStart + span - 1;
  if (!allowOverscroll) {
    if (newStart < 0) {
      newStart = 0;
      newEnd = Math.min(totalCount - 1, span - 1);
    } else if (newEnd >= totalCount) {
      newEnd = totalCount - 1;
      newStart = Math.max(0, totalCount - span);
    }
  } else {
    const minKeepVisible = Math.min(viewport.minVisible || 5, Math.max(1, totalCount));
    const minStart = -(span - minKeepVisible);
    const maxStart = totalCount - minKeepVisible;
    if (newStart < minStart) {
      newStart = minStart;
      newEnd = newStart + span - 1;
    } else if (newStart > maxStart) {
      newStart = maxStart;
      newEnd = newStart + span - 1;
    }
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
  const [viewport, setViewport] = useState2(
    () => initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible)
  );
  const [priceScaleRatio, setPriceScaleRatio] = useState2(1);
  useEffect2(() => {
    setViewport((prev) => {
      if (prev.totalCount === totalCount) return prev;
      if (mode === "follow") return followViewport(prev, totalCount);
      return initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible);
    });
  }, [totalCount, minVisible, mode, initialVisibleBars]);
  const zoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);
  const zoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);
  const resetPriceScale = useCallback(() => {
    setPriceScaleRatio(1);
  }, []);
  const resetView = useCallback(() => {
    setViewport(
      initialVisibleBars ? createTailViewport(totalCount, initialVisibleBars, minVisible) : createViewport(totalCount, minVisible)
    );
    setPriceScaleRatio(1);
  }, [totalCount, minVisible, initialVisibleBars]);
  const pan = useCallback((deltaBars) => {
    setViewport((prev) => panViewport(prev, deltaBars));
  }, []);
  const horizontalZoom = getZoomLevel(viewport);
  const isZoomed = isViewportZoomed(viewport) || priceScaleRatio !== 1;
  const zoomLevel = priceScaleRatio !== 1 ? `${horizontalZoom}x (Y: ${priceScaleRatio.toFixed(1)}x)` : horizontalZoom;
  return {
    viewport,
    setViewport,
    priceScaleRatio,
    setPriceScaleRatio,
    resetPriceScale,
    zoomIn,
    zoomOut,
    resetView,
    pan,
    isZoomed,
    zoomLevel
  };
}

// src/hooks/useChartPointer.ts
import { useCallback as useCallback2, useEffect as useEffect3, useRef as useRef2, useState as useState3 } from "react";
var INACTIVE_RULER = { active: false, startPoint: null, currentPoint: null };
function useChartPointer({
  canvasRef,
  bounds,
  visible,
  slotCount,
  slotOffset = 0,
  indexOffset = 0,
  timeScale = null,
  panZoom = false,
  allowOverscroll = true,
  viewport,
  onViewportChange,
  priceScaleRatio: externalPriceRatio,
  onPriceScaleRatioChange,
  onResetPriceScale,
  onReset
}) {
  const [hover, setHover] = useState3(null);
  const [hoverZone, setHoverZone] = useState3("plot");
  const [internalRatio, setInternalRatio] = useState3(1);
  const [ruler, setRuler] = useState3(INACTIVE_RULER);
  const [isRulerToolActive, setIsRulerToolActive] = useState3(false);
  const [isDragging, setIsDragging] = useState3(false);
  const priceScaleRatio = externalPriceRatio ?? internalRatio;
  const updatePriceRatio = useCallback2(
    (next) => {
      if (onPriceScaleRatioChange) {
        onPriceScaleRatioChange(next);
      } else {
        setInternalRatio(next);
      }
    },
    [onPriceScaleRatioChange]
  );
  const rafRef = useRef2(0);
  const priceScaleRatioRef = useRef2(1);
  priceScaleRatioRef.current = priceScaleRatio;
  function createInitialViewport() {
    return viewport ?? { startIndex: 0, endIndex: 0, totalCount: 0, minVisible: 1 };
  }
  const dragRef = useRef2({
    mode: "none",
    startX: 0,
    startY: 0,
    initialViewport: createInitialViewport(),
    initialPriceScaleRatio: 1
  });
  const schedule = useCallback2((fn) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(fn);
  }, []);
  useEffect3(() => {
    setHover(null);
  }, [visible]);
  useEffect3(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setRuler(INACTIVE_RULER);
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect3(() => () => cancelAnimationFrame(rafRef.current), []);
  const getZone = useCallback2((x, y, b) => {
    const rightAxisX = b.chartWidth - b.padding.right;
    const bottomAxisY = b.chartHeight - b.padding.bottom;
    if (x >= rightAxisX) return "yAxis";
    if (y >= bottomAxisY) return "xAxis";
    return "plot";
  }, []);
  const boundsRef = useRef2(bounds);
  useEffect3(() => {
    boundsRef.current = bounds;
  });
  const viewportChangeRef = useRef2(onViewportChange);
  useEffect3(() => {
    viewportChangeRef.current = onViewportChange;
  });
  const liveViewportRef = useRef2(viewport);
  useEffect3(() => {
    liveViewportRef.current = viewport;
  });
  useEffect3(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panZoom) return;
    let wheelRaf = 0;
    let pending = null;
    const onWheel = (e) => {
      e.preventDefault();
      const b = boundsRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zone = getZone(mouseX, mouseY, b);
      if (zone === "yAxis") {
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        const nextRatio = Math.max(0.1, Math.min(20, priceScaleRatioRef.current * factor));
        updatePriceRatio(nextRatio);
        return;
      }
      if (zone === "xAxis") {
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        pending = { mode: "xAxis", factor, anchorRatio: 0.5 };
      } else {
        const anchorRatio = Math.max(0, Math.min(1, (mouseX - b.padding.left) / b.plotWidth));
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        pending = { mode: "plot", factor, anchorRatio };
      }
      if (wheelRaf) return;
      wheelRaf = requestAnimationFrame(() => {
        wheelRaf = 0;
        const p = pending;
        pending = null;
        if (!p) return;
        const next = zoomViewport(liveViewportRef.current ?? createInitialViewport(), p.factor, p.anchorRatio);
        liveViewportRef.current = next;
        viewportChangeRef.current?.(next);
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(wheelRaf);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [canvasRef, panZoom, getZone, updatePriceRatio]);
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
    const candleIdx = slotOffset != null ? localIdx - slotOffset : localIdx;
    const candle = candleIdx >= 0 && candleIdx < visible.length ? visible[candleIdx] : null;
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
    const zone = getZone(mouseX, mouseY, bounds);
    if (zone === "yAxis" && panZoom) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "scaleY",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport ?? createInitialViewport(),
        initialPriceScaleRatio: priceScaleRatioRef.current
      };
      setHover(null);
      return;
    }
    if (zone === "xAxis" && panZoom && viewport) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "scaleX",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport,
        initialPriceScaleRatio: priceScaleRatioRef.current
      };
      setHover(null);
      return;
    }
    const { candle, price, globalIndex } = hitTest(mouseX, mouseY);
    if (e.shiftKey || isRulerToolActive) {
      const point = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      setRuler({ active: true, startPoint: point, currentPoint: point });
      return;
    }
    if (panZoom && viewport && onViewportChange) {
      canvas.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        mode: "pan",
        startX: mouseX,
        startY: mouseY,
        initialViewport: viewport,
        initialPriceScaleRatio: priceScaleRatioRef.current
      };
    }
  };
  const handlePointerMove = (e) => {
    if (visible.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zone = getZone(mouseX, mouseY, bounds);
    setHoverZone(zone);
    if (dragRef.current.mode === "scaleY") {
      const deltaY = dragRef.current.startY - mouseY;
      const factor = Math.exp(deltaY * 8e-3);
      const nextRatio = Math.max(0.1, Math.min(20, dragRef.current.initialPriceScaleRatio * factor));
      schedule(() => updatePriceRatio(nextRatio));
      return;
    }
    if (dragRef.current.mode === "scaleX" && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX;
      const factor = Math.exp(deltaX * 6e-3);
      const nextViewport = zoomViewport(dragRef.current.initialViewport, factor, 0.5);
      schedule(() => onViewportChange(nextViewport));
      return;
    }
    const { candle, snapX, price, globalIndex } = hitTest(mouseX, mouseY);
    if (ruler.active && ruler.startPoint) {
      const point = { x: mouseX, y: mouseY, price, time: candle?.t, index: globalIndex };
      schedule(() => setRuler((prev) => ({ ...prev, currentPoint: point })));
      return;
    }
    if (dragRef.current.mode === "pan" && onViewportChange) {
      const deltaX = mouseX - dragRef.current.startX;
      const barWidth = bounds.plotWidth / Math.max(1, slotCount ?? visible.length);
      const deltaBars = Math.round(deltaX / barWidth);
      const nextViewport = panViewport(dragRef.current.initialViewport, deltaBars, allowOverscroll);
      schedule(() => {
        onViewportChange(nextViewport);
        setHover(null);
      });
      return;
    }
    if (zone === "plot") {
      schedule(() => setHover({ mouseX, mouseY, snapX, index: globalIndex, candle }));
    } else {
      schedule(() => setHover(null));
    }
  };
  const handlePointerUp = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
  };
  const handlePointerCancel = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
    setHover(null);
  };
  const handlePointerLeave = () => {
    dragRef.current.mode = "none";
    setIsDragging(false);
    setHover(null);
    setHoverZone("plot");
  };
  const handleDoubleClick = (e) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zone = getZone(mouseX, mouseY, bounds);
    if (zone === "yAxis") {
      if (onResetPriceScale) {
        onResetPriceScale();
      } else {
        updatePriceRatio(1);
      }
      return;
    }
    if (zone === "xAxis") {
      onReset?.();
      return;
    }
    if (onResetPriceScale) {
      onResetPriceScale();
    } else {
      updatePriceRatio(1);
    }
    onReset?.();
    clearRuler();
  };
  const toggleRuler = useCallback2(() => {
    setIsRulerToolActive((prev) => {
      if (prev) setRuler(INACTIVE_RULER);
      return !prev;
    });
  }, []);
  const clearRuler = useCallback2(() => {
    setRuler(INACTIVE_RULER);
    setIsRulerToolActive(false);
  }, []);
  const resetPriceScale = useCallback2(() => {
    if (onResetPriceScale) {
      onResetPriceScale();
    } else {
      updatePriceRatio(1);
    }
  }, [onResetPriceScale, updatePriceRatio]);
  const cursorStyle = dragRef.current.mode === "scaleY" || hoverZone === "yAxis" ? "cursor-ns-resize" : dragRef.current.mode === "scaleX" || hoverZone === "xAxis" ? "cursor-ew-resize" : ruler.active || isRulerToolActive ? "cursor-crosshair" : isDragging || dragRef.current.mode === "pan" ? "cursor-grabbing" : panZoom && hoverZone === "plot" ? "cursor-grab" : "cursor-crosshair";
  return {
    hover,
    hoverZone,
    priceScaleRatio,
    resetPriceScale,
    cursorStyle,
    ruler,
    isRulerToolActive,
    toggleRuler,
    clearRuler,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave,
      onDoubleClick: handleDoubleClick
    }
  };
}

// src/hooks/useCrosshairSync.ts
import { useEffect as useEffect4, useId, useRef as useRef3 } from "react";

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
  const sourceId = useId();
  const onRemoteRef = useRef3(onRemoteTime);
  useEffect4(() => {
    onRemoteRef.current = onRemoteTime;
  });
  useEffect4(() => {
    if (!group) return;
    publishCrosshairSync(group, { time: localTime, sourceId });
  }, [group, localTime, sourceId]);
  useEffect4(() => {
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
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var EMPTY_COLORS = {};
var EMPTY_PRICE_LINES = [];
var VortexCandleChart = ({
  candles,
  priceLines = EMPTY_PRICE_LINES,
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
  allowOverscroll = true,
  timeZone,
  theme = {}
}) => {
  const sortedCandles = useMemo(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetView,
    isZoomed,
    zoomLevel,
    priceScaleRatio,
    setPriceScaleRatio,
    resetPriceScale
  } = useChartViewport(sortedCandles.length, 6, {
    mode: viewportMode,
    initialVisibleBars
  });
  const mergedColors = useMemo(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS }),
    [theme.colors]
  );
  const span = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const candleSliceStart = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
  const candleSliceEnd = Math.max(candleSliceStart, Math.min(viewport.endIndex, sortedCandles.length - 1));
  const visibleCandles = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    return sortedCandles.slice(candleSliceStart, candleSliceEnd + 1);
  }, [sortedCandles, candleSliceStart, candleSliceEnd]);
  const slotOffset = sortedCandles.length > 0 ? candleSliceStart - viewport.startIndex : 0;
  const bounds = useMemo(() => {
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
    return {
      computed: computeBounds(prices, containerWidth, height, { factor: priceScaleRatio }),
      lines
    };
  }, [visibleCandles, priceLines, swingHigh, swingLow, spotPrice, atrBounds, mergedColors, containerWidth, height, priceScaleRatio]);
  const chartBounds = bounds.computed;
  const allLines = bounds.lines;
  const timeScaleMapping = useMemo(() => {
    if (!timeScale || visibleCandles.length < 2) return null;
    const tMin = visibleCandles[0].t;
    const tMax = visibleCandles[visibleCandles.length - 1].t;
    return tMax > tMin ? { tMin, tMax } : null;
  }, [timeScale, visibleCandles]);
  const timeLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(visibleCandles.length / maxLabels));
    const labels = [];
    for (let i = 0; i < visibleCandles.length; i += step) {
      const c = visibleCandles[i];
      const x = timeScaleMapping ? timeToX(c.t, timeScaleMapping, chartBounds) : indexToX(slotOffset + i, span, chartBounds);
      if (x >= chartBounds.padding.left && x <= chartBounds.chartWidth - chartBounds.padding.right) {
        labels.push({ x, text: formatCandleTime(c.t, isIntraday, timeZone) });
      }
    }
    return labels;
  }, [visibleCandles, containerWidth, chartBounds, isIntraday, timeScaleMapping, timeZone, slotOffset, span]);
  const handleReset = () => {
    resetView();
    clearRuler();
  };
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, cursorStyle, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds: chartBounds,
    visible: visibleCandles,
    slotCount: span,
    slotOffset,
    indexOffset: viewport.startIndex,
    timeScale: timeScaleMapping,
    panZoom: true,
    allowOverscroll,
    viewport,
    onViewportChange: setViewport,
    priceScaleRatio,
    onPriceScaleRatioChange: setPriceScaleRatio,
    onResetPriceScale: resetPriceScale,
    onReset: handleReset
  });
  const [remoteHoverTime, setRemoteHoverTime] = useState4(null);
  useCrosshairSync({
    group: crosshairSyncGroup,
    localTime: hover?.candle?.t ?? null,
    onRemoteTime: setRemoteHoverTime
  });
  useEffect5(() => {
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
      timeScaleMapping,
      slotOffset,
      span
    );
    drawPriceLines(ctx, allLines, chartBounds);
    if (showWatermark) {
      drawVortexWatermark(ctx, chartBounds);
    }
  }, [containerWidth, height, dpr, chartBounds, visibleCandles, allLines, timeLabels, timeScaleMapping, zones, showWatermark, mergedColors, canvasRef, slotOffset, span]);
  useEffect5(() => {
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
  const hoverMetrics = useMemo(() => {
    if (!hover?.candle) return null;
    const change = formatChange(hover.candle.open, hover.candle.close);
    const vol = formatVolume(hover.candle.volume);
    return { ...change, volumeStr: vol };
  }, [hover]);
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx3(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            className: `block h-full w-full ${cursorStyle}`,
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx3(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ jsx3(
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
        hover && hover.candle && !ruler.active && /* @__PURE__ */ jsxs3("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all", children: [
          /* @__PURE__ */ jsx3("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, isIntraday, timeZone) }),
          /* @__PURE__ */ jsx3("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ jsxs3("span", { children: [
            /* @__PURE__ */ jsx3("strong", { className: "text-zinc-500 font-normal", children: "O: " }),
            /* @__PURE__ */ jsxs3("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.open)
            ] })
          ] }),
          /* @__PURE__ */ jsxs3("span", { children: [
            /* @__PURE__ */ jsx3("strong", { className: "text-zinc-500 font-normal", children: "H: " }),
            /* @__PURE__ */ jsxs3("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.high)
            ] })
          ] }),
          /* @__PURE__ */ jsxs3("span", { children: [
            /* @__PURE__ */ jsx3("strong", { className: "text-zinc-500 font-normal", children: "L: " }),
            /* @__PURE__ */ jsxs3("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.low)
            ] })
          ] }),
          /* @__PURE__ */ jsxs3("span", { children: [
            /* @__PURE__ */ jsx3("strong", { className: "text-zinc-500 font-normal", children: "C: " }),
            /* @__PURE__ */ jsxs3(
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
          hoverMetrics && /* @__PURE__ */ jsxs3(Fragment, { children: [
            /* @__PURE__ */ jsx3("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ jsx3(
              "span",
              {
                className: `font-medium ${hoverMetrics.isBullish ? "text-emerald-400" : "text-rose-400"}`,
                children: hoverMetrics.text
              }
            ),
            hoverMetrics.volumeStr !== "-" && /* @__PURE__ */ jsxs3(Fragment, { children: [
              /* @__PURE__ */ jsx3("div", { className: "h-3 w-px bg-white/15" }),
              /* @__PURE__ */ jsxs3("span", { className: "text-zinc-400", children: [
                /* @__PURE__ */ jsx3("strong", { className: "text-zinc-500 font-normal", children: "Vol: " }),
                /* @__PURE__ */ jsx3("span", { className: "text-zinc-200", children: hoverMetrics.volumeStr })
              ] })
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexRangeChart.tsx
import { useEffect as useEffect6, useMemo as useMemo2, useState as useState5 } from "react";

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
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var EMPTY_COLORS2 = {};
var EMPTY_VWAP = [];
var VortexRangeChart = ({
  candles,
  priorDay,
  premarket,
  vwapSeries = EMPTY_VWAP,
  overlayMode = "all",
  height = 300,
  className = "",
  showWatermark = true,
  showControls = true,
  crosshairSyncGroup,
  viewportMode = "reset",
  initialVisibleBars,
  allowOverscroll = true,
  theme = {}
}) => {
  const sortedCandles = useMemo2(() => {
    return Array.from(new Map(candles.map((c) => [c.t, c])).values()).sort((a, b) => a.t - b.t);
  }, [candles]);
  const { containerRef, canvasRef, overlayRef, containerWidth, dpr } = useChartSurface();
  const {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetView,
    isZoomed,
    zoomLevel,
    priceScaleRatio,
    setPriceScaleRatio,
    resetPriceScale
  } = useChartViewport(sortedCandles.length, 8, {
    mode: viewportMode,
    initialVisibleBars
  });
  const mergedColors = useMemo2(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS2 }),
    [theme.colors]
  );
  const span = Math.max(1, viewport.endIndex - viewport.startIndex + 1);
  const candleSliceStart = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
  const candleSliceEnd = Math.max(candleSliceStart, Math.min(viewport.endIndex, sortedCandles.length - 1));
  const visibleCandles = useMemo2(() => {
    if (sortedCandles.length === 0) return [];
    return sortedCandles.slice(candleSliceStart, candleSliceEnd + 1);
  }, [sortedCandles, candleSliceStart, candleSliceEnd]);
  const slotOffset = sortedCandles.length > 0 ? candleSliceStart - viewport.startIndex : 0;
  const bounds = useMemo2(() => {
    const prices = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));
    if (priorDay && priorDay.high > 0) prices.push(priorDay.high, priorDay.low);
    if (premarket && premarket.high > 0) prices.push(premarket.high, premarket.low);
    vwapSeries.forEach((v) => {
      if (typeof v.vwap === "number" && v.vwap > 0) prices.push(v.vwap);
    });
    return computeBounds(prices, containerWidth, height, { factor: priceScaleRatio });
  }, [visibleCandles, priorDay, premarket, vwapSeries, containerWidth, height, priceScaleRatio]);
  const timeLabels = useMemo2(() => {
    if (visibleCandles.length === 0) return [];
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(visibleCandles.length / maxLabels));
    const labels = [];
    for (let i = 0; i < visibleCandles.length; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(slotOffset + i, span, bounds);
      if (x >= bounds.padding.left && x <= bounds.chartWidth - bounds.padding.right) {
        labels.push({ x, text: formatCandleTime(c.t, true) });
      }
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds, slotOffset, span]);
  const vwapPoints = useMemo2(() => {
    if (vwapSeries.length === 0 || visibleCandles.length === 0) return [];
    const points = [];
    vwapSeries.forEach((v) => {
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < visibleCandles.length; i++) {
        const diff = Math.abs(visibleCandles[i].t - v.t);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      if (closestIdx >= 0 && minDiff < 1e3 * 60 * 30) {
        const x = indexToX(slotOffset + closestIdx, span, bounds);
        points.push({ x, price: v.vwap });
      }
    });
    return points;
  }, [vwapSeries, visibleCandles, bounds, slotOffset, span]);
  const handleReset = () => {
    resetView();
    clearRuler();
  };
  const { hover, ruler, isRulerToolActive, toggleRuler, clearRuler, cursorStyle, pointerHandlers } = useChartPointer({
    canvasRef,
    bounds,
    visible: visibleCandles,
    slotCount: span,
    slotOffset,
    indexOffset: viewport.startIndex,
    panZoom: true,
    allowOverscroll,
    viewport,
    onViewportChange: setViewport,
    priceScaleRatio,
    onPriceScaleRatioChange: setPriceScaleRatio,
    onResetPriceScale: resetPriceScale,
    onReset: handleReset
  });
  const [remoteHoverTime, setRemoteHoverTime] = useState5(null);
  useCrosshairSync({
    group: crosshairSyncGroup,
    localTime: hover?.candle?.t ?? null,
    onRemoteTime: setRemoteHoverTime
  });
  useEffect6(() => {
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
    drawCandlesticks(
      ctx,
      visibleCandles,
      bounds,
      {
        upColor: mergedColors.bullish,
        downColor: mergedColors.bearish
      },
      null,
      slotOffset,
      span
    );
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
  }, [containerWidth, height, dpr, bounds, visibleCandles, priorDay, premarket, vwapPoints, overlayMode, timeLabels, showWatermark, mergedColors, canvasRef, slotOffset, span]);
  useEffect6(() => {
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
          const x = indexToX(slotOffset + idx, span, bounds);
          drawRemoteCrosshair(ctx, bounds, x);
        }
      }
    }
  }, [containerWidth, height, dpr, bounds, hover, ruler, remoteHoverTime, visibleCandles, overlayRef, slotOffset, span]);
  const hoverMetrics = useMemo2(() => {
    if (!hover?.candle) return null;
    const change = formatChange(hover.candle.open, hover.candle.close);
    const vol = formatVolume(hover.candle.volume);
    return { ...change, volumeStr: vol };
  }, [hover]);
  return /* @__PURE__ */ jsxs4(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx4(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            className: `block h-full w-full ${cursorStyle}`,
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx4(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ jsx4(
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
        hover && hover.candle && !ruler.active && /* @__PURE__ */ jsxs4("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all", children: [
          /* @__PURE__ */ jsx4("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, true) }),
          /* @__PURE__ */ jsx4("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ jsxs4("span", { children: [
            /* @__PURE__ */ jsx4("strong", { className: "text-zinc-500 font-normal", children: "O: " }),
            /* @__PURE__ */ jsxs4("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.open)
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("span", { children: [
            /* @__PURE__ */ jsx4("strong", { className: "text-zinc-500 font-normal", children: "H: " }),
            /* @__PURE__ */ jsxs4("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.high)
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("span", { children: [
            /* @__PURE__ */ jsx4("strong", { className: "text-zinc-500 font-normal", children: "L: " }),
            /* @__PURE__ */ jsxs4("span", { className: "text-white", children: [
              "$",
              formatPrice(hover.candle.low)
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("span", { children: [
            /* @__PURE__ */ jsx4("strong", { className: "text-zinc-500 font-normal", children: "C: " }),
            /* @__PURE__ */ jsxs4(
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
          hoverMetrics && /* @__PURE__ */ jsxs4(Fragment2, { children: [
            /* @__PURE__ */ jsx4("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ jsx4(
              "span",
              {
                className: `font-medium ${hoverMetrics.isBullish ? "text-emerald-400" : "text-rose-400"}`,
                children: hoverMetrics.text
              }
            ),
            hoverMetrics.volumeStr !== "-" && /* @__PURE__ */ jsxs4(Fragment2, { children: [
              /* @__PURE__ */ jsx4("div", { className: "h-3 w-px bg-white/15" }),
              /* @__PURE__ */ jsxs4("span", { className: "text-zinc-400", children: [
                /* @__PURE__ */ jsx4("strong", { className: "text-zinc-500 font-normal", children: "Vol: " }),
                /* @__PURE__ */ jsx4("span", { className: "text-zinc-200", children: hoverMetrics.volumeStr })
              ] })
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexConeChart.tsx
import { useEffect as useEffect7, useMemo as useMemo3 } from "react";
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
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
  const mergedColors = useMemo3(
    () => ({ ...VORTEX_THEME.colors, ...theme.colors ?? EMPTY_COLORS3 }),
    [theme.colors]
  );
  const resolvedCandles = useMemo3(() => {
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
  const bounds = useMemo3(() => {
    const prices = [];
    resolvedCandles.forEach((c) => prices.push(c.close));
    if (resolvedSpot > 0) prices.push(resolvedSpot);
    if (resolvedHigh > 0) prices.push(resolvedHigh);
    if (resolvedLow > 0) prices.push(resolvedLow);
    return computeBounds(prices, containerWidth, height);
  }, [resolvedCandles, resolvedSpot, resolvedHigh, resolvedLow, containerWidth, height]);
  const histPoints = useMemo3(() => {
    return resolvedCandles.map((c, idx) => ({
      x: indexToX(idx, totalSlots, bounds),
      price: c.close
    }));
  }, [resolvedCandles, totalSlots, bounds]);
  const timeLabels = useMemo3(() => {
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
  const priceLines = useMemo3(() => {
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
  useEffect7(() => {
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
  useEffect7(() => {
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
  const spotDiff = useMemo3(() => {
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
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx5(
          "canvas",
          {
            ref: canvasRef,
            ...pointerHandlers,
            className: "cursor-crosshair block h-full w-full",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx5(
          "canvas",
          {
            ref: overlayRef,
            className: "pointer-events-none absolute inset-0 block"
          }
        ),
        hover && hover.candle && !ruler.active && /* @__PURE__ */ jsxs5("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums", children: [
          /* @__PURE__ */ jsx5("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, false) }),
          /* @__PURE__ */ jsx5("div", { className: "h-3 w-px bg-white/15" }),
          /* @__PURE__ */ jsxs5("span", { children: [
            /* @__PURE__ */ jsx5("strong", { className: "text-zinc-500 font-normal", children: "Close: " }),
            /* @__PURE__ */ jsxs5("span", { className: "font-bold text-sky-400", children: [
              "$",
              formatPrice(hover.candle.close)
            ] })
          ] }),
          spotDiff && /* @__PURE__ */ jsxs5(Fragment3, { children: [
            /* @__PURE__ */ jsx5("div", { className: "h-3 w-px bg-white/15" }),
            /* @__PURE__ */ jsx5(
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
import { useEffect as useEffect8, useMemo as useMemo4, useRef as useRef4, useState as useState6 } from "react";

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
import { Fragment as Fragment4, jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var EMPTY_REFERENCE_LINES = [];
function formatCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return formatPrice(n);
}
var VortexBarChart = ({
  data,
  referenceLines = EMPTY_REFERENCE_LINES,
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
  const [hover, setHover] = useState6(null);
  const rafRef = useRef4(0);
  const merged = useMemo4(
    () => ({
      posColor: posColor ?? VORTEX_THEME.colors.bullish,
      negColor: negColor ?? VORTEX_THEME.colors.bearish,
      posGlow: posGlow ?? "#34d399",
      negGlow: negGlow ?? "#fb7185",
      overlayColor: overlayColor ?? VORTEX_THEME.colors.spot
    }),
    [posColor, negColor, posGlow, negGlow, overlayColor]
  );
  useEffect8(() => {
    setHover(null);
  }, [data]);
  useEffect8(() => () => cancelAnimationFrame(rafRef.current), []);
  const bounds = useMemo4(
    () => computeBarBounds(data, containerWidth, height, symmetric),
    [data, containerWidth, height, symmetric]
  );
  const options = useMemo4(
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
  useEffect8(() => {
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
  useEffect8(() => {
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
  return /* @__PURE__ */ jsxs6(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none ${className}`,
      style: { height },
      children: [
        data.length === 0 ? /* @__PURE__ */ jsx6("div", { className: "flex h-full items-center justify-center text-xs text-zinc-500", children: "No data available" }) : /* @__PURE__ */ jsxs6(Fragment4, { children: [
          /* @__PURE__ */ jsx6(
            "canvas",
            {
              ref: canvasRef,
              onPointerMove: handlePointerMove,
              onPointerLeave: handlePointerLeave,
              className: "block h-full w-full cursor-crosshair",
              style: { touchAction: "none" }
            }
          ),
          /* @__PURE__ */ jsx6("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" })
        ] }),
        hover && hoveredDatum && /* @__PURE__ */ jsx6(
          "div",
          {
            className: "pointer-events-none absolute z-20",
            style: {
              left: Math.min(Math.max(hover.x + 12, 4), Math.max(containerWidth - 200, 4)),
              top: Math.max(hover.y - 12, 4),
              transform: hover.x > containerWidth - 220 ? "translateX(-100%)" : void 0
            },
            children: tooltipContent ? tooltipContent(hoveredDatum, hover.index) : /* @__PURE__ */ jsxs6("div", { className: "rounded-xl border border-white/10 bg-[#0b0c10]/95 p-3 shadow-2xl backdrop-blur-md", children: [
              /* @__PURE__ */ jsx6("div", { className: "border-b border-white/10 pb-1 text-xs font-bold tabular-nums text-white", children: hoveredDatum.label || `$${formatPrice(hoveredDatum.x)}` }),
              /* @__PURE__ */ jsxs6("div", { className: "mt-2 space-y-1 text-[11px] tabular-nums", children: [
                /* @__PURE__ */ jsxs6("div", { className: "flex justify-between gap-4", children: [
                  /* @__PURE__ */ jsx6("span", { className: "text-zinc-400", children: "Value:" }),
                  /* @__PURE__ */ jsx6(
                    "span",
                    {
                      className: `font-bold ${hoveredDatum.value >= 0 ? "text-emerald-400" : "text-rose-400"}`,
                      children: formatValue(hoveredDatum.value)
                    }
                  )
                ] }),
                typeof hoveredDatum.value2 === "number" && /* @__PURE__ */ jsxs6("div", { className: "flex justify-between gap-4", children: [
                  /* @__PURE__ */ jsx6("span", { className: "text-zinc-400", children: "Secondary:" }),
                  /* @__PURE__ */ jsx6("span", { className: "font-bold text-rose-400", children: formatValue(hoveredDatum.value2) })
                ] }),
                typeof hoveredDatum.overlay === "number" && /* @__PURE__ */ jsxs6("div", { className: "flex justify-between gap-4 border-t border-white/10 pt-1", children: [
                  /* @__PURE__ */ jsx6("span", { className: "text-zinc-400", children: "Net:" }),
                  /* @__PURE__ */ jsx6("span", { className: "font-bold text-sky-300", children: formatValue(hoveredDatum.overlay) })
                ] })
              ] })
            ] })
          }
        )
      ]
    }
  );
};

// src/components/VortexLineChart.tsx
import { useEffect as useEffect9, useMemo as useMemo5, useState as useState7 } from "react";

// src/utils/color.ts
function colorWithAlpha(color, alpha) {
  if (!color) return `rgba(56, 189, 248, ${alpha})`;
  const a = Math.max(0, Math.min(1, alpha));
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  if (trimmed.startsWith("rgb(")) {
    return trimmed.replace("rgb(", "rgba(").replace(")", `, ${a})`);
  }
  if (trimmed.startsWith("rgba(")) {
    return trimmed.replace(/,\s*[\d.]+\)$/, `, ${a})`);
  }
  if (trimmed.startsWith("hsl(")) {
    return trimmed.replace("hsl(", "hsla(").replace(")", `, ${a})`);
  }
  if (trimmed.startsWith("hsla(")) {
    return trimmed.replace(/,\s*[\d.]+\)$/, `, ${a})`);
  }
  return trimmed;
}

// src/engine/line-chart.ts
function traceSmoothSpline(ctx, points) {
  if (points.length < 2) return;
  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}
function drawLineChart(ctx, data, bounds, options = {}) {
  if (!data || data.length === 0) return;
  const {
    color = "#38bdf8",
    lineWidth = 2.5,
    showArea = true,
    areaTopOpacity = 0.35,
    showPoints = false,
    pointRadius = 3.5,
    glow = true,
    smooth = true
  } = options;
  const total = data.length;
  const points = [];
  for (let i = 0; i < total; i++) {
    const pt = data[i];
    const x = typeof pt.x === "number" ? pt.x : indexToX(i, total, bounds);
    const y = typeof pt.y === "number" ? pt.y : priceToY(pt.price, bounds);
    points.push({ x, y });
  }
  if (points.length < 2) {
    if (points.length === 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, pointRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  if (showArea) {
    const bottomY = bounds.chartHeight - bounds.padding.bottom;
    if (typeof ctx.createLinearGradient === "function") {
      const gradient = ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY);
      gradient.addColorStop(0, colorWithAlpha(color, areaTopOpacity));
      gradient.addColorStop(0.5, colorWithAlpha(color, areaTopOpacity * 0.35));
      gradient.addColorStop(1, colorWithAlpha(color, 0));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colorWithAlpha(color, areaTopOpacity * 0.5);
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, bottomY);
    ctx.lineTo(points[0].x, points[0].y);
    if (smooth) {
      traceSmoothSpline(ctx, points);
    } else {
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.lineTo(points[points.length - 1].x, bottomY);
    ctx.closePath();
    ctx.fill();
  }
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  if (smooth) {
    traceSmoothSpline(ctx, points);
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (showPoints) {
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#020616";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = colorWithAlpha(color, 0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// src/components/VortexLineChart.tsx
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var VortexLineChart = ({
  data,
  height = 300,
  className = "",
  color = "#38bdf8",
  showArea = true,
  showPoints = false,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState7(null);
  const [cursorPos, setCursorPos] = useState7(null);
  const bounds = useMemo5(() => {
    const prices = data.map((d) => d.price);
    return computeBounds(prices, containerWidth, height);
  }, [data, containerWidth, height]);
  useEffect9(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawLineChart(ctx, data, bounds, {
      color: theme.colors?.spot ?? color,
      showArea,
      showPoints,
      glow: true,
      smooth: true
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, showArea, showPoints, showWatermark, theme, canvasRef]);
  useEffect9(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && data[hoverIndex]) {
      const item = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(item.price, bounds);
      const activeColor = theme.colors?.spot ?? color;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: item.label || `Day ${hoverIndex + 1}`,
        yLabel: `$${formatPrice(item.price)}`,
        color: activeColor,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, color, theme]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;
  const firstPrice = data[0]?.price ?? 0;
  const delta = hoveredItem && firstPrice > 0 ? hoveredItem.price - firstPrice : 0;
  const deltaPct = firstPrice > 0 ? delta / firstPrice * 100 : 0;
  return /* @__PURE__ */ jsxs7(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx7(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx7("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hoveredItem && cursorPos && /* @__PURE__ */ jsxs7(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300 transition-transform duration-75",
            style: {
              left: Math.min(containerWidth - 160, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 70, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between gap-3 border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsx7("span", { className: "font-semibold text-white", children: hoveredItem.label || (hoverIndex !== null ? `Index ${hoverIndex + 1}` : "") }),
                /* @__PURE__ */ jsx7("span", { className: "text-[10px] text-zinc-500 font-mono", children: "LIVE" })
              ] }),
              /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs7("span", { className: "text-white font-bold", children: [
                  "$",
                  formatPrice(hoveredItem.price)
                ] }),
                /* @__PURE__ */ jsxs7("span", { className: `text-[11px] font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`, children: [
                  delta >= 0 ? "+" : "",
                  delta.toFixed(2),
                  " (",
                  delta >= 0 ? "+" : "",
                  deltaPct.toFixed(2),
                  "%)"
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexOhlcChart.tsx
import { useEffect as useEffect10, useMemo as useMemo6, useState as useState8 } from "react";

// src/engine/ohlc-bars.ts
function drawOhlcBars(ctx, candles, bounds, options = {}) {
  if (!candles || candles.length === 0) return;
  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    lineWidth = 1.5,
    tickWidth
  } = options;
  const count = candles.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const halfTick = tickWidth ? tickWidth / 2 : Math.max(2, Math.min(8, slotWidth * 0.35));
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const c = candles[i];
    const x = Math.round(indexToX(i, count, bounds));
    const yHigh = Math.round(priceToY(c.high, bounds));
    const yLow = Math.round(priceToY(c.low, bounds));
    const yOpen = Math.round(priceToY(c.open, bounds));
    const yClose = Math.round(priceToY(c.close, bounds));
    const isBullish = c.close >= c.open;
    const color = isBullish ? upColor : downColor;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yOpen);
    ctx.lineTo(x - halfTick, yOpen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yClose);
    ctx.lineTo(x + halfTick, yClose);
    ctx.stroke();
  }
  ctx.restore();
}

// src/components/VortexOhlcChart.tsx
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var VortexOhlcChart = ({
  data,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  lineWidth = 1.5,
  tickWidth,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState8(null);
  const [cursorPos, setCursorPos] = useState8(null);
  const bounds = useMemo6(() => {
    const allPrices = [];
    data.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [data, containerWidth, height]);
  useEffect10(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawOhlcBars(ctx, data, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
      lineWidth,
      tickWidth
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, upColor, downColor, lineWidth, tickWidth, showWatermark, theme, canvasRef]);
  useEffect10(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && data[hoverIndex]) {
      const c = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(c.close, bounds);
      const color = c.close >= c.open ? theme.colors?.bullish ?? upColor : theme.colors?.bearish ?? downColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Bar #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(c.close)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, upColor, downColor, theme]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const isUp = hovered ? hovered.close >= hovered.open : true;
  const change = hovered ? hovered.close - hovered.open : 0;
  const changePct = hovered && hovered.open > 0 ? change / hovered.open * 100 : 0;
  return /* @__PURE__ */ jsxs8(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx8(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx8("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs8(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 190, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 95, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs8("div", { className: "flex items-center justify-between border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs8("span", { className: "font-semibold text-white", children: [
                  "OHLC Bar #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsxs8("span", { className: `text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`, children: [
                  isUp ? "BULL" : "BEAR",
                  " (",
                  change >= 0 ? "+" : "",
                  changePct.toFixed(2),
                  "%)"
                ] })
              ] }),
              /* @__PURE__ */ jsxs8("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]", children: [
                /* @__PURE__ */ jsxs8("div", { children: [
                  /* @__PURE__ */ jsx8("span", { className: "text-zinc-500", children: "O:" }),
                  " ",
                  /* @__PURE__ */ jsxs8("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(hovered.open)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs8("div", { children: [
                  /* @__PURE__ */ jsx8("span", { className: "text-zinc-500", children: "H:" }),
                  " ",
                  /* @__PURE__ */ jsxs8("strong", { className: "text-emerald-400", children: [
                    "$",
                    formatPrice(hovered.high)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs8("div", { children: [
                  /* @__PURE__ */ jsx8("span", { className: "text-zinc-500", children: "L:" }),
                  " ",
                  /* @__PURE__ */ jsxs8("strong", { className: "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.low)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs8("div", { children: [
                  /* @__PURE__ */ jsx8("span", { className: "text-zinc-500", children: "C:" }),
                  " ",
                  /* @__PURE__ */ jsxs8("strong", { className: isUp ? "text-emerald-400" : "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.close)
                  ] })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexHeikinAshiChart.tsx
import { useEffect as useEffect11, useMemo as useMemo7, useState as useState9 } from "react";

// src/engine/heikin-ashi.ts
function computeHeikinAshi(candles) {
  if (!candles || candles.length === 0) return [];
  const result = new Array(candles.length);
  for (let i = 0; i < candles.length; i++) {
    const curr = candles[i];
    const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
    let haOpen;
    if (i === 0) {
      haOpen = (curr.open + curr.close) / 2;
    } else {
      const prev = result[i - 1];
      haOpen = (prev.open + prev.close) / 2;
    }
    const haHigh = Math.max(curr.high, haOpen, haClose);
    const haLow = Math.min(curr.low, haOpen, haClose);
    result[i] = {
      t: curr.t,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: curr.volume
    };
  }
  return result;
}

// src/components/VortexHeikinAshiChart.tsx
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var VortexHeikinAshiChart = ({
  data,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState9(null);
  const [cursorPos, setCursorPos] = useState9(null);
  const haCandles = useMemo7(() => computeHeikinAshi(data), [data]);
  const bounds = useMemo7(() => {
    const allPrices = [];
    haCandles.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [haCandles, containerWidth, height]);
  useEffect11(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawCandlesticks(ctx, haCandles, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, haCandles, upColor, downColor, showWatermark, theme, canvasRef]);
  useEffect11(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && haCandles[hoverIndex]) {
      const c = haCandles[hoverIndex];
      const snapX = indexToX(hoverIndex, haCandles.length, bounds);
      const snapY = priceToY(c.close, bounds);
      const color = c.close >= c.open ? theme.colors?.bullish ?? upColor : theme.colors?.bearish ?? downColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `HA #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(c.close)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, haCandles, upColor, downColor, theme]);
  const handlePointerMove = (e) => {
    if (!haCandles || haCandles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, haCandles.length);
    const idx = Math.max(0, Math.min(haCandles.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? haCandles[hoverIndex] : null;
  const isUp = hovered ? hovered.close >= hovered.open : true;
  return /* @__PURE__ */ jsxs9(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx9(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx9("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs9(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 190, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 95, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs9("div", { className: "flex items-center justify-between border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs9("span", { className: "font-semibold text-white", children: [
                  "Heikin-Ashi #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsx9("span", { className: `text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`, children: isUp ? "SMOOTHED BULL" : "SMOOTHED BEAR" })
              ] }),
              /* @__PURE__ */ jsxs9("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]", children: [
                /* @__PURE__ */ jsxs9("div", { children: [
                  /* @__PURE__ */ jsx9("span", { className: "text-zinc-500", children: "O:" }),
                  " ",
                  /* @__PURE__ */ jsxs9("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(hovered.open)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs9("div", { children: [
                  /* @__PURE__ */ jsx9("span", { className: "text-zinc-500", children: "H:" }),
                  " ",
                  /* @__PURE__ */ jsxs9("strong", { className: "text-emerald-400", children: [
                    "$",
                    formatPrice(hovered.high)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs9("div", { children: [
                  /* @__PURE__ */ jsx9("span", { className: "text-zinc-500", children: "L:" }),
                  " ",
                  /* @__PURE__ */ jsxs9("strong", { className: "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.low)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs9("div", { children: [
                  /* @__PURE__ */ jsx9("span", { className: "text-zinc-500", children: "C:" }),
                  " ",
                  /* @__PURE__ */ jsxs9("strong", { className: isUp ? "text-emerald-400" : "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.close)
                  ] })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexRenkoChart.tsx
import { useEffect as useEffect12, useMemo as useMemo8, useState as useState10 } from "react";

// src/engine/renko.ts
function computeRenkoBricks(candles, brickSize = 1) {
  if (!candles || candles.length === 0 || brickSize <= 0) return [];
  const bricks = [];
  let refPrice = candles[0].close;
  let lastBrickTop = refPrice;
  let lastBrickBottom = refPrice;
  let lastDirectionUp = true;
  let hasFirstBrick = false;
  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;
    const time = candles[i].t;
    if (!hasFirstBrick) {
      while (price >= refPrice + brickSize) {
        const open = refPrice;
        const close = refPrice + brickSize;
        bricks.push({
          open,
          close,
          high: close,
          low: open,
          isUp: true,
          t: time
        });
        lastBrickBottom = open;
        lastBrickTop = close;
        lastDirectionUp = true;
        hasFirstBrick = true;
        refPrice = close;
      }
      while (price <= refPrice - brickSize) {
        const open = refPrice;
        const close = refPrice - brickSize;
        bricks.push({
          open,
          close,
          high: open,
          low: close,
          isUp: false,
          t: time
        });
        lastBrickTop = open;
        lastBrickBottom = close;
        lastDirectionUp = false;
        hasFirstBrick = true;
        refPrice = close;
      }
      continue;
    }
    while (price >= lastBrickTop + brickSize) {
      const open = lastBrickTop;
      const close = lastBrickTop + brickSize;
      bricks.push({
        open,
        close,
        high: close,
        low: open,
        isUp: true,
        t: time
      });
      lastBrickBottom = open;
      lastBrickTop = close;
      lastDirectionUp = true;
    }
    while (price <= lastBrickBottom - brickSize) {
      const open = lastBrickBottom;
      const close = lastBrickBottom - brickSize;
      bricks.push({
        open,
        close,
        high: open,
        low: close,
        isUp: false,
        t: time
      });
      lastBrickTop = open;
      lastBrickBottom = close;
      lastDirectionUp = false;
    }
  }
  return bricks;
}
function drawRenkoBricks(ctx, bricks, bounds, options = {}) {
  if (!bricks || bricks.length === 0) return;
  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    borderColor = "rgba(255, 255, 255, 0.15)"
  } = options;
  const count = bricks.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const brickWidth = Math.max(2, Math.min(30, slotWidth * 0.85));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const b = bricks[i];
    const x = Math.round(indexToX(i, count, bounds) - brickWidth / 2);
    const yTop = Math.round(priceToY(Math.max(b.open, b.close), bounds));
    const yBottom = Math.round(priceToY(Math.min(b.open, b.close), bounds));
    const height = Math.max(2, yBottom - yTop);
    ctx.fillStyle = b.isUp ? upColor : downColor;
    ctx.fillRect(x, yTop, brickWidth, height);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, yTop, brickWidth, height);
  }
  ctx.restore();
}

// src/components/VortexRenkoChart.tsx
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var VortexRenkoChart = ({
  data,
  brickSize = 1,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState10(null);
  const [cursorPos, setCursorPos] = useState10(null);
  const bricks = useMemo8(() => {
    return computeRenkoBricks(data, brickSize);
  }, [data, brickSize]);
  const bounds = useMemo8(() => {
    const allPrices = [];
    bricks.forEach((b) => {
      allPrices.push(b.high, b.low, b.open, b.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [bricks, containerWidth, height]);
  useEffect12(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawRenkoBricks(ctx, bricks, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, bricks, upColor, downColor, showWatermark, theme, canvasRef]);
  useEffect12(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && bricks[hoverIndex]) {
      const b = bricks[hoverIndex];
      const snapX = indexToX(hoverIndex, bricks.length, bounds);
      const snapY = priceToY(b.close, bounds);
      const color = b.isUp ? theme.colors?.bullish ?? upColor : theme.colors?.bearish ?? downColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Brick #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(b.close)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, bricks, upColor, downColor, theme]);
  const handlePointerMove = (e) => {
    if (!bricks || bricks.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, bricks.length);
    const idx = Math.max(0, Math.min(bricks.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? bricks[hoverIndex] : null;
  return /* @__PURE__ */ jsxs10(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx10(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx10("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs10(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 75, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs10("div", { className: "flex items-center justify-between gap-3 border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs10("span", { className: "font-semibold text-white", children: [
                  "Brick #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsx10("span", { className: `text-[10px] font-bold ${hovered.isUp ? "text-emerald-400" : "text-rose-400"}`, children: hovered.isUp ? "BULLISH" : "BEARISH" })
              ] }),
              /* @__PURE__ */ jsxs10("div", { className: "flex items-center justify-between gap-4 text-[11px]", children: [
                /* @__PURE__ */ jsxs10("span", { className: "text-zinc-400", children: [
                  "Open: $",
                  formatPrice(hovered.open)
                ] }),
                /* @__PURE__ */ jsxs10("span", { className: "text-white font-bold", children: [
                  "Close: $",
                  formatPrice(hovered.close)
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexPointFigureChart.tsx
import { useEffect as useEffect13, useMemo as useMemo9, useState as useState11 } from "react";

// src/engine/point-figure.ts
function computePointAndFigure(candles, boxSize = 1, reversal = 3) {
  if (!candles || candles.length === 0 || boxSize <= 0) return [];
  const columns = [];
  const startPrice = Math.floor(candles[0].close / boxSize) * boxSize;
  let currentType = "X";
  let currentBoxes = [startPrice];
  let lastTime = candles[0].t;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const time = candles[i].t;
    if (currentType === "X") {
      const topBox = currentBoxes[currentBoxes.length - 1];
      const nextBox = topBox + boxSize;
      if (high >= nextBox) {
        let p = nextBox;
        while (high >= p) {
          currentBoxes.push(p);
          p += boxSize;
        }
      } else if (low <= topBox - reversal * boxSize) {
        columns.push({ type: "X", boxes: [...currentBoxes], t: lastTime });
        currentType = "O";
        currentBoxes = [];
        let p = topBox - boxSize;
        while (p >= low) {
          currentBoxes.push(p);
          p -= boxSize;
        }
        lastTime = time;
      }
    } else {
      const bottomBox = currentBoxes[currentBoxes.length - 1];
      const nextBox = bottomBox - boxSize;
      if (low <= nextBox) {
        let p = nextBox;
        while (low <= p) {
          currentBoxes.push(p);
          p -= boxSize;
        }
      } else if (high >= bottomBox + reversal * boxSize) {
        columns.push({ type: "O", boxes: [...currentBoxes], t: lastTime });
        currentType = "X";
        currentBoxes = [];
        let p = bottomBox + boxSize;
        while (p <= high) {
          currentBoxes.push(p);
          p += boxSize;
        }
        lastTime = time;
      }
    }
  }
  if (currentBoxes.length > 0) {
    columns.push({ type: currentType, boxes: currentBoxes, t: lastTime });
  }
  return columns;
}
function drawPointAndFigure(ctx, columns, bounds, boxSize, options = {}) {
  if (!columns || columns.length === 0) return;
  const {
    xColor = "#10b981",
    oColor = "#f43f5e"
  } = options;
  const count = columns.length;
  const colWidth = bounds.plotWidth / Math.max(1, count);
  const glyphSize = Math.max(3, Math.min(18, colWidth * 0.75));
  ctx.save();
  ctx.lineWidth = 1.8;
  for (let c = 0; c < count; c++) {
    const col = columns[c];
    const x = Math.round(indexToX(c, count, bounds));
    if (col.type === "X") {
      ctx.strokeStyle = xColor;
      for (const price of col.boxes) {
        const y = Math.round(priceToY(price, bounds));
        const half = glyphSize / 2;
        ctx.beginPath();
        ctx.moveTo(x - half, y - half);
        ctx.lineTo(x + half, y + half);
        ctx.moveTo(x + half, y - half);
        ctx.lineTo(x - half, y + half);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = oColor;
      for (const price of col.boxes) {
        const y = Math.round(priceToY(price, bounds));
        const radius = glyphSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// src/components/VortexPointFigureChart.tsx
import { jsx as jsx11, jsxs as jsxs11 } from "react/jsx-runtime";
var VortexPointFigureChart = ({
  data,
  boxSize = 1,
  reversal = 3,
  height = 340,
  className = "",
  xColor = "#10b981",
  oColor = "#f43f5e",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState11(null);
  const [cursorPos, setCursorPos] = useState11(null);
  const columns = useMemo9(() => {
    return computePointAndFigure(data, boxSize, reversal);
  }, [data, boxSize, reversal]);
  const bounds = useMemo9(() => {
    const allBoxes = [];
    columns.forEach((col) => {
      col.boxes.forEach((b) => allBoxes.push(b));
    });
    return computeBounds(allBoxes, containerWidth, height);
  }, [columns, containerWidth, height]);
  useEffect13(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawPointAndFigure(ctx, columns, bounds, boxSize, {
      xColor: theme.colors?.bullish ?? xColor,
      oColor: theme.colors?.bearish ?? oColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, columns, boxSize, xColor, oColor, showWatermark, theme, canvasRef]);
  useEffect13(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && columns[hoverIndex]) {
      const col = columns[hoverIndex];
      const snapX = indexToX(hoverIndex, columns.length, bounds);
      const topPrice = Math.max(...col.boxes);
      const snapY = priceToY(topPrice, bounds);
      const color = col.type === "X" ? theme.colors?.bullish ?? xColor : theme.colors?.bearish ?? oColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Col #${hoverIndex + 1} (${col.type})`,
        yLabel: `$${formatPrice(topPrice)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, columns, xColor, oColor, theme]);
  const handlePointerMove = (e) => {
    if (!columns || columns.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, columns.length);
    const idx = Math.max(0, Math.min(columns.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? columns[hoverIndex] : null;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx11(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx11("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs11(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 180, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 75, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs11("div", { className: "flex items-center justify-between gap-3 border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs11("span", { className: "font-semibold text-white", children: [
                  "Column #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsx11("span", { className: `text-[10px] font-bold ${hovered.type === "X" ? "text-emerald-400" : "text-rose-400"}`, children: hovered.type === "X" ? "X (DEMAND)" : "O (SUPPLY)" })
              ] }),
              /* @__PURE__ */ jsxs11("div", { className: "flex items-center justify-between gap-3 text-[11px]", children: [
                /* @__PURE__ */ jsxs11("span", { className: "text-zinc-400", children: [
                  "Boxes: ",
                  hovered.boxes.length
                ] }),
                hovered.boxes.length > 0 && /* @__PURE__ */ jsxs11("span", { className: "text-white font-bold", children: [
                  "$",
                  formatPrice(Math.min(...hovered.boxes)),
                  " - $",
                  formatPrice(Math.max(...hovered.boxes))
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexFootprintChart.tsx
import { useEffect as useEffect14, useMemo as useMemo10, useState as useState12 } from "react";

// src/engine/footprint.ts
function drawFootprintChart(ctx, bars, bounds, options = {}) {
  if (!bars || bars.length === 0) return;
  const {
    upColor = "#10b981",
    downColor = "#f43f5e",
    bidColor = "#f43f5e",
    askColor = "#10b981",
    showText = true
  } = options;
  const count = bars.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const barWidth = Math.max(36, Math.min(110, slotWidth * 0.92));
  let maxRungVol = 1;
  for (const b of bars) {
    if (b.levels) {
      for (const lvl of b.levels) {
        if (lvl.bidVolume > maxRungVol) maxRungVol = lvl.bidVolume;
        if (lvl.askVolume > maxRungVol) maxRungVol = lvl.askVolume;
      }
    }
  }
  ctx.save();
  ctx.font = "bold 9px Inter, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < count; i++) {
    const bar = bars[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - barWidth / 2);
    const midX = centerX;
    const isUp = bar.close >= bar.open;
    const yHigh = Math.round(priceToY(bar.high, bounds));
    const yLow = Math.round(priceToY(bar.low, bounds));
    ctx.strokeStyle = isUp ? upColor : downColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, yHigh);
    ctx.lineTo(centerX, yLow);
    ctx.stroke();
    if (bar.levels && bar.levels.length > 0) {
      const rowHeight = Math.max(12, (yLow - yHigh) / bar.levels.length);
      let barPocIdx = 0;
      let barMaxVol = 0;
      for (let l = 0; l < bar.levels.length; l++) {
        const lvl = bar.levels[l];
        const lvlTot = lvl.bidVolume + lvl.askVolume;
        if (lvlTot > barMaxVol) {
          barMaxVol = lvlTot;
          barPocIdx = l;
        }
      }
      let barTotalDelta = 0;
      for (let l = 0; l < bar.levels.length; l++) {
        const lvl = bar.levels[l];
        const y = Math.round(priceToY(lvl.price, bounds));
        const delta = lvl.delta ?? lvl.askVolume - lvl.bidVolume;
        barTotalDelta += delta;
        const isPoc = l === barPocIdx;
        const bidOpacity = 0.12 + Math.min(0.7, lvl.bidVolume / maxRungVol * 0.7);
        const askOpacity = 0.12 + Math.min(0.7, lvl.askVolume / maxRungVol * 0.7);
        ctx.fillStyle = colorWithAlpha(bidColor, bidOpacity);
        ctx.fillRect(leftX, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);
        ctx.fillStyle = colorWithAlpha(askColor, askOpacity);
        ctx.fillRect(midX + 1, y - rowHeight / 2, barWidth / 2 - 1, rowHeight - 1);
        if (isPoc) {
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(leftX, y - rowHeight / 2, barWidth, rowHeight - 1);
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          ctx.strokeRect(leftX, y - rowHeight / 2, barWidth, rowHeight - 1);
        }
        if (showText && barWidth >= 44 && rowHeight >= 11) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(lvl.bidVolume), leftX + barWidth / 4, y);
          ctx.fillText(String(lvl.askVolume), midX + barWidth / 4, y);
        }
      }
      ctx.font = "bold 8px Inter, monospace";
      ctx.fillStyle = barTotalDelta >= 0 ? "#10b981" : "#f43f5e";
      const deltaStr = `\u0394 ${barTotalDelta >= 0 ? "+" : ""}${barTotalDelta}`;
      ctx.fillText(deltaStr, centerX, yLow + 10);
      ctx.font = "bold 9px Inter, monospace";
    }
  }
  ctx.restore();
}

// src/components/VortexFootprintChart.tsx
import { jsx as jsx12, jsxs as jsxs12 } from "react/jsx-runtime";
var VortexFootprintChart = ({
  data,
  height = 360,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  bidColor = "rgba(244, 63, 94, 0.4)",
  askColor = "rgba(16, 185, 129, 0.4)",
  showText = true,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState12(null);
  const bounds = useMemo10(() => {
    const allPrices = [];
    data.forEach((b) => {
      allPrices.push(b.high, b.low, b.open, b.close);
      b.levels.forEach((lvl) => allPrices.push(lvl.price));
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [data, containerWidth, height]);
  useEffect14(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawFootprintChart(ctx, data, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor,
      bidColor,
      askColor,
      showText
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, upColor, downColor, bidColor, askColor, showText, showWatermark, theme, canvasRef]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  return /* @__PURE__ */ jsxs12(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx12(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoverIndex(null),
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx12("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && /* @__PURE__ */ jsxs12("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          /* @__PURE__ */ jsxs12("span", { className: "text-zinc-400 font-semibold", children: [
            "Bar #",
            hoverIndex + 1,
            ":"
          ] }),
          /* @__PURE__ */ jsxs12("span", { children: [
            "Vol: ",
            /* @__PURE__ */ jsx12("strong", { className: "text-white", children: hovered.totalVolume.toLocaleString() })
          ] }),
          /* @__PURE__ */ jsxs12("span", { children: [
            "O: ",
            /* @__PURE__ */ jsxs12("strong", { className: "text-white", children: [
              "$",
              formatPrice(hovered.open)
            ] })
          ] }),
          /* @__PURE__ */ jsxs12("span", { children: [
            "C: ",
            /* @__PURE__ */ jsxs12("strong", { className: hovered.close >= hovered.open ? "text-emerald-400" : "text-rose-400", children: [
              "$",
              formatPrice(hovered.close)
            ] })
          ] }),
          /* @__PURE__ */ jsxs12("span", { children: [
            "Levels: ",
            /* @__PURE__ */ jsx12("strong", { className: "text-sky-400", children: hovered.levels.length })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexVolumeProfileChart.tsx
import { useEffect as useEffect15, useMemo as useMemo11, useState as useState13 } from "react";

// src/engine/volume-profile.ts
function computeVolumeProfile(candles, rows = 24, valueAreaRatio = 0.7) {
  if (!candles || candles.length === 0 || rows <= 0) return null;
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }
  if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
    return null;
  }
  const step = (maxPrice - minPrice) / rows;
  const rawBins = [];
  for (let r = 0; r < rows; r++) {
    const bottom = minPrice + r * step;
    const top = bottom + step;
    rawBins.push({
      volume: 0,
      price: (bottom + top) / 2,
      bottom,
      top
    });
  }
  let totalVolume = 0;
  for (const c of candles) {
    const vol = c.volume ?? 1;
    totalVolume += vol;
    const cLow = Math.max(minPrice, c.low);
    const cHigh = Math.min(maxPrice, c.high);
    const cSpan = Math.max(1e-4, cHigh - cLow);
    for (let r = 0; r < rows; r++) {
      const b = rawBins[r];
      const overlapStart = Math.max(cLow, b.bottom);
      const overlapEnd = Math.min(cHigh, b.top);
      if (overlapEnd > overlapStart) {
        const fraction = (overlapEnd - overlapStart) / cSpan;
        b.volume += vol * fraction;
      }
    }
  }
  let maxBinVolume = 0;
  let pocIdx = 0;
  for (let r = 0; r < rows; r++) {
    if (rawBins[r].volume > maxBinVolume) {
      maxBinVolume = rawBins[r].volume;
      pocIdx = r;
    }
  }
  const pocPrice = rawBins[pocIdx].price;
  const targetVaVolume = totalVolume * valueAreaRatio;
  let currentVaVolume = rawBins[pocIdx].volume;
  const inVa = /* @__PURE__ */ new Set([pocIdx]);
  let upPtr = pocIdx + 1;
  let downPtr = pocIdx - 1;
  while (currentVaVolume < targetVaVolume && (upPtr < rows || downPtr >= 0)) {
    const upVol = upPtr < rows ? rawBins[upPtr].volume : -1;
    const downVol = downPtr >= 0 ? rawBins[downPtr].volume : -1;
    if (upVol >= downVol && upPtr < rows) {
      currentVaVolume += upVol;
      inVa.add(upPtr);
      upPtr++;
    } else if (downPtr >= 0) {
      currentVaVolume += downVol;
      inVa.add(downPtr);
      downPtr--;
    } else if (upPtr < rows) {
      currentVaVolume += upVol;
      inVa.add(upPtr);
      upPtr++;
    }
  }
  const vaIndices = Array.from(inVa).sort((a, b) => a - b);
  const valPrice = rawBins[vaIndices[0]].bottom;
  const vahPrice = rawBins[vaIndices[vaIndices.length - 1]].top;
  const bins = rawBins.map((b, idx) => ({
    price: b.price,
    priceTop: b.top,
    priceBottom: b.bottom,
    volume: b.volume,
    isValueArea: inVa.has(idx),
    isPoc: idx === pocIdx
  }));
  return {
    bins,
    pocPrice,
    vahPrice,
    valPrice,
    totalVolume,
    maxBinVolume
  };
}
function drawVolumeProfile(ctx, profile, bounds, options = {}) {
  if (!profile || profile.bins.length === 0 || profile.maxBinVolume <= 0) return;
  const {
    alignment = "right",
    widthRatio = 0.32,
    pocColor = "#eab308",
    valueAreaColor = "rgba(56, 189, 248, 0.45)",
    otherAreaColor = "rgba(100, 116, 139, 0.22)",
    showLines = true
  } = options;
  const maxProfileWidth = bounds.plotWidth * widthRatio;
  const startX = alignment === "right" ? bounds.padding.left + bounds.plotWidth : bounds.padding.left;
  ctx.save();
  for (const bin of profile.bins) {
    const yTop = Math.round(priceToY(bin.priceTop, bounds));
    const yBottom = Math.round(priceToY(bin.priceBottom, bounds));
    const barHeight = Math.max(1, yBottom - yTop);
    const barWidth = bin.volume / profile.maxBinVolume * maxProfileWidth;
    const x = alignment === "right" ? startX - barWidth : startX;
    ctx.fillStyle = bin.isPoc ? pocColor : bin.isValueArea ? valueAreaColor : otherAreaColor;
    ctx.fillRect(x, yTop, barWidth, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(x, yTop, barWidth, barHeight);
    }
  }
  if (showLines) {
    const yPoc = Math.round(priceToY(profile.pocPrice, bounds));
    ctx.strokeStyle = pocColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = pocColor;
    ctx.shadowBlur = 8;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(bounds.padding.left, yPoc);
    ctx.lineTo(bounds.padding.left + bounds.plotWidth, yPoc);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = pocColor;
    ctx.fillRect(bounds.padding.left + bounds.plotWidth + 2, yPoc - 7, 54, 14);
    ctx.fillStyle = "#020616";
    ctx.font = "bold 9px Inter, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`POC ${profile.pocPrice.toFixed(1)}`, bounds.padding.left + bounds.plotWidth + 29, yPoc);
    const yVah = Math.round(priceToY(profile.vahPrice, bounds));
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(bounds.padding.left, yVah);
    ctx.lineTo(bounds.padding.left + bounds.plotWidth, yVah);
    ctx.stroke();
    const yVal = Math.round(priceToY(profile.valPrice, bounds));
    ctx.beginPath();
    ctx.moveTo(bounds.padding.left, yVal);
    ctx.lineTo(bounds.padding.left + bounds.plotWidth, yVal);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// src/components/VortexVolumeProfileChart.tsx
import { jsx as jsx13, jsxs as jsxs13 } from "react/jsx-runtime";
var VortexVolumeProfileChart = ({
  data,
  rows = 28,
  valueAreaRatio = 0.7,
  alignment = "right",
  showCandles = true,
  upColor = "#10b981",
  downColor = "#f43f5e",
  pocColor = "#eab308",
  valueAreaColor = "rgba(56, 189, 248, 0.4)",
  otherAreaColor = "rgba(100, 116, 139, 0.2)",
  height = 360,
  className = "",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState13(null);
  const profile = useMemo11(() => {
    return computeVolumeProfile(data, rows, valueAreaRatio);
  }, [data, rows, valueAreaRatio]);
  const bounds = useMemo11(() => {
    const allPrices = [];
    data.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [data, containerWidth, height]);
  useEffect15(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    if (showCandles && data.length > 0) {
      drawCandlesticks(ctx, data, bounds, {
        upColor: theme.colors?.bullish ?? upColor,
        downColor: theme.colors?.bearish ?? downColor
      });
    }
    if (profile) {
      drawVolumeProfile(ctx, profile, bounds, {
        alignment,
        pocColor,
        valueAreaColor,
        otherAreaColor,
        showLines: true
      });
    }
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, profile, alignment, showCandles, upColor, downColor, pocColor, valueAreaColor, otherAreaColor, showWatermark, theme, canvasRef]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  return /* @__PURE__ */ jsxs13(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx13(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoverIndex(null),
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx13("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        profile && /* @__PURE__ */ jsxs13("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          /* @__PURE__ */ jsxs13("span", { children: [
            "POC: ",
            /* @__PURE__ */ jsxs13("strong", { className: "text-amber-400", children: [
              "$",
              formatPrice(profile.pocPrice)
            ] })
          ] }),
          /* @__PURE__ */ jsxs13("span", { children: [
            "VAH: ",
            /* @__PURE__ */ jsxs13("strong", { className: "text-sky-400", children: [
              "$",
              formatPrice(profile.vahPrice)
            ] })
          ] }),
          /* @__PURE__ */ jsxs13("span", { children: [
            "VAL: ",
            /* @__PURE__ */ jsxs13("strong", { className: "text-sky-400", children: [
              "$",
              formatPrice(profile.valPrice)
            ] })
          ] }),
          hovered && /* @__PURE__ */ jsxs13("span", { children: [
            "Close: ",
            /* @__PURE__ */ jsxs13("strong", { className: "text-white", children: [
              "$",
              formatPrice(hovered.close)
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexRangeBarChart.tsx
import { useEffect as useEffect16, useMemo as useMemo12, useState as useState14 } from "react";

// src/engine/range-bars.ts
function computeRangeBars(ticks, rangeSize = 0.5) {
  if (!ticks || ticks.length === 0 || rangeSize <= 0) return [];
  const rawPrices = [];
  for (const item of ticks) {
    if ("price" in item && typeof item.price === "number") {
      rawPrices.push({
        price: item.price,
        volume: item.volume ?? 1,
        t: item.t ?? Date.now()
      });
    } else if ("close" in item) {
      const c = item;
      rawPrices.push({ price: c.open, volume: (c.volume ?? 4) * 0.25, t: c.t });
      if (c.close >= c.open) {
        rawPrices.push({ price: c.low, volume: (c.volume ?? 4) * 0.25, t: c.t });
        rawPrices.push({ price: c.high, volume: (c.volume ?? 4) * 0.25, t: c.t });
      } else {
        rawPrices.push({ price: c.high, volume: (c.volume ?? 4) * 0.25, t: c.t });
        rawPrices.push({ price: c.low, volume: (c.volume ?? 4) * 0.25, t: c.t });
      }
      rawPrices.push({ price: c.close, volume: (c.volume ?? 4) * 0.25, t: c.t });
    }
  }
  if (rawPrices.length === 0) return [];
  const bars = [];
  let currentOpen = rawPrices[0].price;
  let currentHigh = currentOpen;
  let currentLow = currentOpen;
  let currentVolume = 0;
  let currentT = rawPrices[0].t;
  for (const p of rawPrices) {
    currentVolume += p.volume;
    currentT = p.t;
    if (p.price > currentHigh) currentHigh = p.price;
    if (p.price < currentLow) currentLow = p.price;
    if (currentHigh - currentLow >= rangeSize) {
      const close = p.price;
      bars.push({
        t: currentT,
        open: currentOpen,
        high: currentHigh,
        low: currentLow,
        close,
        volume: currentVolume
      });
      currentOpen = close;
      currentHigh = close;
      currentLow = close;
      currentVolume = 0;
    }
  }
  if (currentVolume > 0 || bars.length === 0) {
    bars.push({
      t: currentT,
      open: currentOpen,
      high: currentHigh,
      low: currentLow,
      close: rawPrices[rawPrices.length - 1].price,
      volume: currentVolume
    });
  }
  return bars;
}

// src/components/VortexRangeBarChart.tsx
import { jsx as jsx14, jsxs as jsxs14 } from "react/jsx-runtime";
var VortexRangeBarChart = ({
  data,
  rangeSize = 1,
  height = 340,
  className = "",
  upColor = "#10b981",
  downColor = "#f43f5e",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState14(null);
  const [cursorPos, setCursorPos] = useState14(null);
  const rangeCandles = useMemo12(() => {
    return computeRangeBars(data, rangeSize);
  }, [data, rangeSize]);
  const bounds = useMemo12(() => {
    const allPrices = [];
    rangeCandles.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [rangeCandles, containerWidth, height]);
  useEffect16(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawCandlesticks(ctx, rangeCandles, bounds, {
      upColor: theme.colors?.bullish ?? upColor,
      downColor: theme.colors?.bearish ?? downColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, rangeCandles, upColor, downColor, showWatermark, theme, canvasRef]);
  useEffect16(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && rangeCandles[hoverIndex]) {
      const c = rangeCandles[hoverIndex];
      const snapX = indexToX(hoverIndex, rangeCandles.length, bounds);
      const snapY = priceToY(c.close, bounds);
      const color = c.close >= c.open ? theme.colors?.bullish ?? upColor : theme.colors?.bearish ?? downColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: `Range #${hoverIndex + 1}`,
        yLabel: `$${formatPrice(c.close)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, rangeCandles, upColor, downColor, theme]);
  const handlePointerMove = (e) => {
    if (!rangeCandles || rangeCandles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, rangeCandles.length);
    const idx = Math.max(0, Math.min(rangeCandles.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? rangeCandles[hoverIndex] : null;
  const isUp = hovered ? hovered.close >= hovered.open : true;
  return /* @__PURE__ */ jsxs14(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx14(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx14("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs14(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 190, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 95, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs14("div", { className: "flex items-center justify-between border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs14("span", { className: "font-semibold text-white", children: [
                  "Range Bar #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsx14("span", { className: `text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`, children: isUp ? "RANGE UP" : "RANGE DOWN" })
              ] }),
              /* @__PURE__ */ jsxs14("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]", children: [
                /* @__PURE__ */ jsxs14("div", { children: [
                  /* @__PURE__ */ jsx14("span", { className: "text-zinc-500", children: "O:" }),
                  " ",
                  /* @__PURE__ */ jsxs14("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(hovered.open)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs14("div", { children: [
                  /* @__PURE__ */ jsx14("span", { className: "text-zinc-500", children: "H:" }),
                  " ",
                  /* @__PURE__ */ jsxs14("strong", { className: "text-emerald-400", children: [
                    "$",
                    formatPrice(hovered.high)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs14("div", { children: [
                  /* @__PURE__ */ jsx14("span", { className: "text-zinc-500", children: "L:" }),
                  " ",
                  /* @__PURE__ */ jsxs14("strong", { className: "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.low)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs14("div", { children: [
                  /* @__PURE__ */ jsx14("span", { className: "text-zinc-500", children: "C:" }),
                  " ",
                  /* @__PURE__ */ jsxs14("strong", { className: isUp ? "text-emerald-400" : "text-rose-400", children: [
                    "$",
                    formatPrice(hovered.close)
                  ] })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexMultiLineChart.tsx
import { useEffect as useEffect17, useMemo as useMemo13, useState as useState15 } from "react";
import { jsx as jsx15, jsxs as jsxs15 } from "react/jsx-runtime";
var DEFAULT_SERIES_COLORS = [
  "#38bdf8",
  // Sky
  "#10b981",
  // Emerald
  "#f43f5e",
  // Rose
  "#c084fc",
  // Purple
  "#eab308",
  // Amber
  "#f97316"
  // Orange
];
var VortexMultiLineChart = ({
  series,
  height = 340,
  className = "",
  showPoints = false,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState15(null);
  const [cursorPos, setCursorPos] = useState15(null);
  const normalizedSeries = useMemo13(() => {
    return series.map((s, sIdx) => {
      const color = s.color || DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length];
      const points = s.data.map((pt, pIdx) => {
        if (typeof pt === "number") {
          return { price: pt, label: `Point ${pIdx + 1}` };
        }
        return pt;
      });
      return {
        name: s.name,
        color,
        points
      };
    });
  }, [series]);
  const bounds = useMemo13(() => {
    const allPrices = [];
    normalizedSeries.forEach((s) => {
      s.points.forEach((p) => allPrices.push(p.price));
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [normalizedSeries, containerWidth, height]);
  useEffect17(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    normalizedSeries.forEach((s) => {
      drawLineChart(ctx, s.points, bounds, {
        color: s.color,
        showArea: false,
        showPoints,
        glow: true,
        smooth: true
      });
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, normalizedSeries, showPoints, showWatermark, theme, canvasRef]);
  const maxPoints = Math.max(0, ...normalizedSeries.map((s) => s.points.length));
  useEffect17(() => {
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
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(snapX) + 0.5, bounds.padding.top);
      ctx.lineTo(Math.round(snapX) + 0.5, bottomAxisY);
      ctx.stroke();
      ctx.setLineDash([]);
      normalizedSeries.forEach((s) => {
        const pt = s.points[hoverIndex];
        if (!pt) return;
        const snapY = priceToY(pt.price, bounds);
        ctx.beginPath();
        ctx.arc(snapX, snapY, 6, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(snapX, snapY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      const labelText = `Day ${hoverIndex + 1}`;
      const badgeW = 60;
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
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, maxPoints, normalizedSeries]);
  const handlePointerMove = (e) => {
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
  return /* @__PURE__ */ jsxs15(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx15("div", { className: "absolute top-2.5 right-4 z-20 flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md", children: normalizedSeries.map((s) => /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-1.5 text-xs", children: [
          /* @__PURE__ */ jsx15("span", { className: "h-2 w-2 rounded-full", style: { backgroundColor: s.color } }),
          /* @__PURE__ */ jsx15("span", { className: "text-zinc-300 font-mono text-[11px]", children: s.name })
        ] }, s.name)) }),
        /* @__PURE__ */ jsx15(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx15("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hoverIndex !== null && cursorPos && /* @__PURE__ */ jsxs15(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 190, Math.max(10, cursorPos.x + 16)),
              top: Math.min(height - 110, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs15("div", { className: "flex items-center justify-between border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsxs15("span", { className: "text-zinc-400 font-semibold", children: [
                  "Timeline #",
                  hoverIndex + 1
                ] }),
                /* @__PURE__ */ jsx15("span", { className: "text-[10px] text-cyan-400 font-mono", children: "COMPARISON" })
              ] }),
              /* @__PURE__ */ jsx15("div", { className: "flex flex-col gap-1", children: normalizedSeries.map((s) => {
                const pt = s.points[hoverIndex];
                if (!pt) return null;
                return /* @__PURE__ */ jsxs15("div", { className: "flex items-center justify-between gap-4", children: [
                  /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx15("span", { className: "h-1.5 w-1.5 rounded-full", style: { backgroundColor: s.color } }),
                    /* @__PURE__ */ jsx15("span", { className: "text-zinc-300 text-[11px]", children: s.name.split(" ")[0] })
                  ] }),
                  /* @__PURE__ */ jsxs15("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(pt.price)
                  ] })
                ] }, s.name);
              }) })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexScatterPlot.tsx
import { useEffect as useEffect18, useMemo as useMemo14, useState as useState16 } from "react";

// src/engine/scatter.ts
function computeScatterBounds(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) minX = 0;
  if (!isFinite(maxX)) maxX = 100;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxY)) maxY = 100;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  return {
    minX: minX - spanX * 0.1,
    maxX: maxX + spanX * 0.1,
    minY: minY - spanY * 0.1,
    maxY: maxY + spanY * 0.1
  };
}
function drawScatterPlot(ctx, points, bounds, scatterBounds, options = {}) {
  if (!points || points.length === 0) return;
  const {
    pointColor = "#38bdf8",
    defaultRadius = 6,
    showTrendLine = false,
    trendLineColor = "#38bdf8",
    glow = true,
    hoveredIndex = null
  } = options;
  const { minX, maxX, minY, maxY } = scatterBounds;
  const rangeX = Math.max(maxX - minX, 1e-4);
  const rangeY = Math.max(maxY - minY, 1e-4);
  function mapX(xVal) {
    const ratio = (xVal - minX) / rangeX;
    return bounds.padding.left + ratio * bounds.plotWidth;
  }
  function mapY(yVal) {
    const ratio = (yVal - minY) / rangeY;
    return bounds.padding.top + bounds.plotHeight * (1 - ratio);
  }
  ctx.save();
  if (showTrendLine && points.length >= 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const denom = n * sumXX - sumX * sumX;
    ctx.strokeStyle = trendLineColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = trendLineColor;
    ctx.shadowBlur = 6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    if (Math.abs(denom) < 1e-5) {
      const vx = mapX(points[0].x);
      ctx.moveTo(vx, mapY(minY));
      ctx.lineTo(vx, mapY(maxY));
    } else {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      const x1 = minX;
      const y1 = slope * x1 + intercept;
      const x2 = maxX;
      const y2 = slope * x2 + intercept;
      ctx.moveTo(mapX(x1), mapY(y1));
      ctx.lineTo(mapX(x2), mapY(y2));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const px = mapX(p.x);
    const py = mapY(p.y);
    const radius = p.size ? Math.max(3, p.size) : defaultRadius;
    const color = p.color || pointColor;
    const isHovered = hoveredIndex === i;
    if (isHovered) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, bounds.chartHeight - bounds.padding.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bounds.chartWidth - bounds.padding.right, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(color, 0.25);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(px, py, isHovered ? radius + 1.5 : radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = isHovered ? 12 : 6;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke();
    if (p.label) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.label, px, py - radius - 4);
    }
  }
  ctx.restore();
}

// src/components/VortexScatterPlot.tsx
import { jsx as jsx16, jsxs as jsxs16 } from "react/jsx-runtime";
var VortexScatterPlot = ({
  data,
  height = 360,
  className = "",
  pointColor = "#38bdf8",
  defaultRadius = 6,
  showTrendLine = false,
  trendLineColor = "#38bdf8",
  glow = true,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredIndex, setHoveredIndex] = useState16(null);
  const scatterBounds = useMemo14(() => {
    return computeScatterBounds(data);
  }, [data]);
  const bounds = useMemo14(() => {
    return computeBounds([scatterBounds.minY, scatterBounds.maxY], containerWidth, height);
  }, [scatterBounds, containerWidth, height]);
  useEffect18(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawScatterPlot(ctx, data, bounds, scatterBounds, {
      pointColor: theme.colors?.spot ?? pointColor,
      defaultRadius,
      showTrendLine,
      trendLineColor,
      glow,
      hoveredIndex
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, scatterBounds, pointColor, defaultRadius, showTrendLine, trendLineColor, glow, hoveredIndex, showWatermark, theme, canvasRef]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const rangeX = Math.max(scatterBounds.maxX - scatterBounds.minX, 1e-4);
    const rangeY = Math.max(scatterBounds.maxY - scatterBounds.minY, 1e-4);
    let nearestIdx = null;
    let minDist = 22;
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const px = bounds.padding.left + (pt.x - scatterBounds.minX) / rangeX * bounds.plotWidth;
      const py = bounds.padding.top + (1 - (pt.y - scatterBounds.minY) / rangeY) * bounds.plotHeight;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    setHoveredIndex(nearestIdx);
  };
  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  return /* @__PURE__ */ jsxs16(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx16(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoveredIndex(null),
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx16("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hoveredPoint && /* @__PURE__ */ jsxs16("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          hoveredPoint.label && /* @__PURE__ */ jsx16("span", { className: "font-semibold text-white", children: hoveredPoint.label }),
          /* @__PURE__ */ jsxs16("span", { children: [
            "X: ",
            /* @__PURE__ */ jsx16("strong", { className: "text-sky-400", children: hoveredPoint.x.toFixed(2) })
          ] }),
          /* @__PURE__ */ jsxs16("span", { children: [
            "Y: ",
            /* @__PURE__ */ jsx16("strong", { className: "text-emerald-400", children: hoveredPoint.y.toFixed(2) })
          ] }),
          hoveredPoint.size && /* @__PURE__ */ jsxs16("span", { children: [
            "Size: ",
            /* @__PURE__ */ jsx16("strong", { className: "text-zinc-400", children: hoveredPoint.size })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexHeatmap.tsx
import { useEffect as useEffect19, useMemo as useMemo15, useState as useState17 } from "react";

// src/engine/heatmap.ts
function getRgba(ratio, scale) {
  const r = Math.max(0, Math.min(1, ratio));
  if (scale === "coolwarm") {
    const red = Math.round(244 * (1 - r) + 56 * r);
    const green = Math.round(63 * (1 - r) + 189 * r);
    const blue = Math.round(94 * (1 - r) + 248 * r);
    return [red, green, blue, 0.85];
  }
  if (scale === "emerald") {
    const alpha = 0.15 + r * 0.85;
    return [16, 185, 129, alpha];
  }
  if (r < 0.5) {
    const t = r * 2;
    const red = Math.round(15 * (1 - t) + 56 * t);
    const green = Math.round(23 * (1 - t) + 189 * t);
    const blue = Math.round(42 * (1 - t) + 248 * t);
    return [red, green, blue, 0.25 + t * 0.65];
  } else {
    const t = (r - 0.5) * 2;
    const red = Math.round(56 * (1 - t) + 16 * t);
    const green = Math.round(189 * (1 - t) + 185 * t);
    const blue = Math.round(248 * (1 - t) + 129 * t);
    return [red, green, blue, 0.85 + t * 0.15];
  }
}
function drawHeatmap(ctx, data, bounds, options = {}) {
  const { xLabels, yLabels, values } = data;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) return;
  const {
    colorScale = "vortex",
    showValues = true,
    cellPadding = 2.5,
    borderRadius = 4,
    hoveredCell = null
  } = options;
  const numRows = yLabels.length;
  const numCols = xLabels.length;
  let min = data.minValue ?? Infinity;
  let max = data.maxValue ?? -Infinity;
  if (data.minValue === void 0 || data.maxValue === void 0) {
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const val = values[r]?.[c] ?? 0;
        if (data.minValue === void 0 && val < min) min = val;
        if (data.maxValue === void 0 && val > max) max = val;
      }
    }
  }
  const range = Math.max(max - min, 1e-4);
  const cellWidth = bounds.plotWidth / numCols;
  const cellHeight = bounds.plotHeight / numRows;
  ctx.save();
  ctx.font = "bold 10px Inter, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const val = values[r]?.[c] ?? 0;
      const norm = (val - min) / range;
      const [cr, cg, cb, ca] = getRgba(norm, colorScale);
      const x = bounds.padding.left + c * cellWidth + cellPadding;
      const y = bounds.padding.top + r * cellHeight + cellPadding;
      const w = Math.max(1, cellWidth - cellPadding * 2);
      const h = Math.max(1, cellHeight - cellPadding * 2);
      const isHovered = hoveredCell && hoveredCell.row === r && hoveredCell.col === c;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, borderRadius);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
      ctx.fill();
      if (isHovered) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (showValues && w >= 22 && h >= 14) {
        const luminance = (0.299 * cr + 0.587 * cg + 0.114 * cb) * ca;
        ctx.fillStyle = luminance > 125 ? "#020616" : "#ffffff";
        ctx.fillText(val.toFixed(2), x + w / 2, y + h / 2);
      }
    }
  }
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px Inter, sans-serif";
  for (let c = 0; c < numCols; c++) {
    const x = bounds.padding.left + c * cellWidth + cellWidth / 2;
    const y = bounds.chartHeight - bounds.padding.bottom + 14;
    ctx.fillText(xLabels[c] ?? "", x, y);
  }
  ctx.textAlign = "left";
  for (let r = 0; r < numRows; r++) {
    const x = bounds.chartWidth - bounds.padding.right + 6;
    const y = bounds.padding.top + r * cellHeight + cellHeight / 2;
    ctx.fillText(yLabels[r] ?? "", x, y);
  }
  ctx.restore();
}

// src/components/VortexHeatmap.tsx
import { jsx as jsx17, jsxs as jsxs17 } from "react/jsx-runtime";
var VortexHeatmap = ({
  data,
  height = 360,
  className = "",
  colorScale = "vortex",
  showValues = true,
  cellPadding = 2.5,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredCell, setHoveredCell] = useState17(null);
  const bounds = useMemo15(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);
  useEffect19(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawHeatmap(ctx, data, bounds, {
      colorScale,
      showValues,
      cellPadding,
      hoveredCell: hoveredCell ? { row: hoveredCell.row, col: hoveredCell.col } : null
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, colorScale, showValues, cellPadding, hoveredCell, showWatermark, theme, canvasRef]);
  const numCols = data.xLabels.length;
  const numRows = data.yLabels.length;
  const handlePointerMove = (e) => {
    if (numCols === 0 || numRows === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const left = bounds.padding.left;
    const top = bounds.padding.top;
    const plotW = bounds.plotWidth;
    const plotH = bounds.plotHeight;
    if (mouseX < left || mouseX > left + plotW || mouseY < top || mouseY > top + plotH) {
      setHoveredCell(null);
      return;
    }
    const col = Math.floor((mouseX - left) / plotW * numCols);
    const row = Math.floor((mouseY - top) / plotH * numRows);
    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      const val = data.values[row]?.[col] ?? 0;
      setHoveredCell({ row, col, val });
    } else {
      setHoveredCell(null);
    }
  };
  return /* @__PURE__ */ jsxs17(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx17(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoveredCell(null),
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx17("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hoveredCell && /* @__PURE__ */ jsxs17("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          /* @__PURE__ */ jsx17("span", { className: "text-zinc-400 font-semibold", children: data.yLabels[hoveredCell.row] || `Row ${hoveredCell.row + 1}` }),
          /* @__PURE__ */ jsx17("span", { className: "text-zinc-500", children: "x" }),
          /* @__PURE__ */ jsx17("span", { className: "text-white font-semibold", children: data.xLabels[hoveredCell.col] || `Col ${hoveredCell.col + 1}` }),
          /* @__PURE__ */ jsx17("span", { className: "text-zinc-500", children: "|" }),
          /* @__PURE__ */ jsxs17("span", { children: [
            "Correlation: ",
            /* @__PURE__ */ jsx17("strong", { className: "text-sky-400", children: hoveredCell.val.toFixed(2) })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexAreaChart.tsx
import { useEffect as useEffect20, useMemo as useMemo16, useState as useState18 } from "react";

// src/engine/area.ts
function traceSmoothSpline2(ctx, points) {
  if (points.length < 2) return;
  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}
function drawAreaChart(ctx, data, bounds, options = {}) {
  if (!data || data.length < 2) return;
  const {
    color = "#38bdf8",
    gradientTopOpacity = 0.4,
    gradientBottomOpacity = 0,
    lineWidth = 2.5,
    showLine = true,
    smooth = true,
    glow = true
  } = options;
  const count = data.length;
  const points = [];
  for (let i = 0; i < count; i++) {
    const pt = data[i];
    const x = typeof pt.x === "number" ? pt.x : indexToX(i, count, bounds);
    const y = priceToY(pt.y, bounds);
    points.push({ x, y });
  }
  const bottomY = bounds.chartHeight - bounds.padding.bottom;
  ctx.save();
  const gradient = typeof ctx.createLinearGradient === "function" ? ctx.createLinearGradient(0, bounds.padding.top, 0, bottomY) : null;
  if (gradient) {
    gradient.addColorStop(0, colorWithAlpha(color, gradientTopOpacity));
    gradient.addColorStop(0.5, colorWithAlpha(color, gradientTopOpacity * 0.35));
    gradient.addColorStop(1, colorWithAlpha(color, gradientBottomOpacity));
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = colorWithAlpha(color, gradientTopOpacity * 0.5);
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, bottomY);
  ctx.lineTo(points[0].x, points[0].y);
  if (smooth) {
    traceSmoothSpline2(ctx, points);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.lineTo(points[points.length - 1].x, bottomY);
  ctx.closePath();
  ctx.fill();
  if (showLine) {
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    if (smooth) {
      traceSmoothSpline2(ctx, points);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = colorWithAlpha(color, 0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// src/components/VortexAreaChart.tsx
import { jsx as jsx18, jsxs as jsxs18 } from "react/jsx-runtime";
var VortexAreaChart = ({
  data,
  height = 320,
  className = "",
  color = "#38bdf8",
  gradientTopOpacity = 0.45,
  gradientBottomOpacity = 0.02,
  lineWidth = 2.5,
  showLine = true,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState18(null);
  const [cursorPos, setCursorPos] = useState18(null);
  const bounds = useMemo16(() => {
    const prices = data.map((d) => d.y);
    return computeBounds(prices, containerWidth, height);
  }, [data, containerWidth, height]);
  useEffect20(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawAreaChart(ctx, data, bounds, {
      color: theme.colors?.spot ?? color,
      gradientTopOpacity,
      gradientBottomOpacity,
      lineWidth,
      showLine,
      smooth: true,
      glow: true
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, color, gradientTopOpacity, gradientBottomOpacity, lineWidth, showLine, showWatermark, theme, canvasRef]);
  useEffect20(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && data[hoverIndex]) {
      const item = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(item.y, bounds);
      const activeColor = theme.colors?.spot ?? color;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: item.label || `Point ${hoverIndex + 1}`,
        yLabel: `$${formatPrice(item.y)}`,
        color: activeColor,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, color, theme]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const firstVal = data[0]?.y ?? 0;
  const delta = hovered && firstVal > 0 ? hovered.y - firstVal : 0;
  const deltaPct = firstVal > 0 ? delta / firstVal * 100 : 0;
  return /* @__PURE__ */ jsxs18(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx18(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx18("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs18(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-cyan-500/30 bg-[#020616]/90 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 70, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs18("div", { className: "flex items-center justify-between gap-3 border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsx18("span", { className: "font-semibold text-white", children: hovered.label || (hoverIndex !== null ? `Day ${hoverIndex + 1}` : "") }),
                /* @__PURE__ */ jsx18("span", { className: "text-[10px] text-zinc-500 font-mono", children: "EQUITY" })
              ] }),
              /* @__PURE__ */ jsxs18("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs18("span", { className: "text-white font-bold", children: [
                  "$",
                  formatPrice(hovered.y)
                ] }),
                /* @__PURE__ */ jsxs18("span", { className: `text-[11px] font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`, children: [
                  delta >= 0 ? "+" : "",
                  delta.toFixed(0),
                  " (",
                  delta >= 0 ? "+" : "",
                  deltaPct.toFixed(1),
                  "%)"
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexBoxPlot.tsx
import { useEffect as useEffect21, useMemo as useMemo17, useState as useState19 } from "react";

// src/engine/box-plot.ts
function computeBoxPlotStats(rawValues, label = "") {
  if (!rawValues || rawValues.length === 0) {
    return { label, min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
  }
  const sorted = [...rawValues].sort((a, b) => a - b);
  const n = sorted.length;
  function quantile(q) {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== void 0) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }
  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
  const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[n - 1];
  return {
    label,
    min,
    q1,
    median,
    q3,
    max,
    outliers
  };
}
function drawBoxPlot(ctx, data, bounds, options = {}) {
  if (!data || data.length === 0) return;
  const {
    boxColor = "#38bdf8",
    medianColor = "#eab308",
    whiskerColor = "#94a3b8",
    outlierColor = "#f43f5e"
  } = options;
  const count = data.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const boxWidth = Math.max(14, Math.min(64, slotWidth * 0.55));
  const whiskerCapWidth = boxWidth * 0.55;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const item = data[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - boxWidth / 2);
    const yMin = Math.round(priceToY(item.min, bounds));
    const yQ1 = Math.round(priceToY(item.q1, bounds));
    const yMedian = Math.round(priceToY(item.median, bounds));
    const yQ3 = Math.round(priceToY(item.q3, bounds));
    const yMax = Math.round(priceToY(item.max, bounds));
    ctx.strokeStyle = whiskerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, yQ1);
    ctx.lineTo(centerX, yMin);
    ctx.moveTo(centerX - whiskerCapWidth / 2, yMin);
    ctx.lineTo(centerX + whiskerCapWidth / 2, yMin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, yQ3);
    ctx.lineTo(centerX, yMax);
    ctx.moveTo(centerX - whiskerCapWidth / 2, yMax);
    ctx.lineTo(centerX + whiskerCapWidth / 2, yMax);
    ctx.stroke();
    const boxHeight = Math.max(2, yQ1 - yQ3);
    if (typeof ctx.createLinearGradient === "function") {
      const boxGradient = ctx.createLinearGradient(0, yQ3, 0, yQ1);
      boxGradient.addColorStop(0, colorWithAlpha(boxColor, 0.35));
      boxGradient.addColorStop(1, colorWithAlpha(boxColor, 0.15));
      ctx.fillStyle = boxGradient;
    } else {
      ctx.fillStyle = colorWithAlpha(boxColor, 0.25);
    }
    ctx.fillRect(leftX, yQ3, boxWidth, boxHeight);
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 1.5;
    if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(leftX, yQ3, boxWidth, boxHeight);
    }
    ctx.shadowColor = medianColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = medianColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftX, yMedian);
    ctx.lineTo(leftX + boxWidth, yMedian);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (item.outliers && item.outliers.length > 0) {
      for (const out of item.outliers) {
        const yOut = Math.round(priceToY(out, bounds));
        ctx.beginPath();
        ctx.arc(centerX, yOut, 6, 0, Math.PI * 2);
        ctx.fillStyle = colorWithAlpha(outlierColor, 0.25);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, yOut, 3, 0, Math.PI * 2);
        ctx.fillStyle = outlierColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (item.label) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.label, centerX, bounds.chartHeight - bounds.padding.bottom + 14);
    }
  }
  ctx.restore();
}

// src/components/VortexBoxPlot.tsx
import { jsx as jsx19, jsxs as jsxs19 } from "react/jsx-runtime";
var VortexBoxPlot = ({
  data,
  height = 360,
  className = "",
  boxColor = "rgba(56, 189, 248, 0.35)",
  medianColor = "#eab308",
  whiskerColor = "rgba(255, 255, 255, 0.4)",
  outlierColor = "#f43f5e",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState19(null);
  const [cursorPos, setCursorPos] = useState19(null);
  const normalizedItems = useMemo17(() => {
    return data.map((item) => {
      if ("values" in item && Array.isArray(item.values)) {
        return computeBoxPlotStats(item.values, item.label);
      }
      return item;
    });
  }, [data]);
  const bounds = useMemo17(() => {
    const allValues = [];
    normalizedItems.forEach((it) => {
      allValues.push(it.min, it.q1, it.median, it.q3, it.max);
      if (it.outliers) {
        allValues.push(...it.outliers);
      }
    });
    return computeBounds(allValues, containerWidth, height, { allowZeroOrNegative: true });
  }, [normalizedItems, containerWidth, height]);
  useEffect21(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawBoxPlot(ctx, normalizedItems, bounds, {
      boxColor,
      medianColor,
      whiskerColor,
      outlierColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, normalizedItems, boxColor, medianColor, whiskerColor, outlierColor, showWatermark, theme, canvasRef]);
  useEffect21(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && normalizedItems[hoverIndex]) {
      const it = normalizedItems[hoverIndex];
      const snapX = indexToX(hoverIndex, normalizedItems.length, bounds);
      const snapY = priceToY(it.median, bounds);
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: it.label,
        yLabel: `Median: $${formatPrice(it.median)}`,
        color: medianColor,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, normalizedItems, medianColor]);
  const handlePointerMove = (e) => {
    if (!normalizedItems || normalizedItems.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, normalizedItems.length);
    const idx = Math.max(0, Math.min(normalizedItems.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? normalizedItems[hoverIndex] : null;
  return /* @__PURE__ */ jsxs19(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx19(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx19("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs19(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2.5 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 200, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 110, Math.max(10, cursorPos.y - 50))
            },
            children: [
              /* @__PURE__ */ jsxs19("div", { className: "flex items-center justify-between border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsx19("span", { className: "font-semibold text-white", children: hovered.label }),
                /* @__PURE__ */ jsx19("span", { className: "text-[10px] text-amber-400 font-mono", children: "Tukey 5-Pt" })
              ] }),
              /* @__PURE__ */ jsxs19("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]", children: [
                /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Max:" }),
                  " ",
                  /* @__PURE__ */ jsxs19("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(hovered.max)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Q3:" }),
                  " ",
                  /* @__PURE__ */ jsxs19("strong", { className: "text-sky-300", children: [
                    "$",
                    formatPrice(hovered.q3)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Median:" }),
                  " ",
                  /* @__PURE__ */ jsxs19("strong", { className: "text-amber-400 font-bold", children: [
                    "$",
                    formatPrice(hovered.median)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Q1:" }),
                  " ",
                  /* @__PURE__ */ jsxs19("strong", { className: "text-sky-300", children: [
                    "$",
                    formatPrice(hovered.q1)
                  ] })
                ] }),
                /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Min:" }),
                  " ",
                  /* @__PURE__ */ jsxs19("strong", { className: "text-white", children: [
                    "$",
                    formatPrice(hovered.min)
                  ] })
                ] }),
                hovered.outliers && hovered.outliers.length > 0 && /* @__PURE__ */ jsxs19("div", { children: [
                  /* @__PURE__ */ jsx19("span", { className: "text-zinc-500", children: "Outliers:" }),
                  " ",
                  /* @__PURE__ */ jsx19("strong", { className: "text-rose-400", children: hovered.outliers.length })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexWaterfallChart.tsx
import { useEffect as useEffect22, useMemo as useMemo18, useState as useState20 } from "react";

// src/engine/waterfall.ts
function drawWaterfallChart(ctx, bars, bounds, options = {}) {
  if (!bars || bars.length === 0) return;
  const {
    positiveColor = "#10b981",
    negativeColor = "#f43f5e",
    totalColor = "#38bdf8",
    connectorColor = "rgba(255, 255, 255, 0.25)"
  } = options;
  const count = bars.length;
  const slotWidth = bounds.plotWidth / Math.max(1, count);
  const barWidth = Math.max(14, Math.min(64, slotWidth * 0.65));
  ctx.save();
  ctx.font = "bold 9px Inter, monospace";
  let runningTotal = 0;
  let prevY = Math.round(priceToY(0, bounds));
  for (let i = 0; i < count; i++) {
    const b = bars[i];
    const centerX = Math.round(indexToX(i, count, bounds));
    const leftX = Math.round(centerX - barWidth / 2);
    let topVal;
    let bottomVal;
    let color;
    if (b.isTotal) {
      bottomVal = 0;
      topVal = b.value;
      color = totalColor;
      runningTotal = b.value;
    } else {
      bottomVal = runningTotal;
      topVal = runningTotal + b.value;
      color = b.value >= 0 ? positiveColor : negativeColor;
      runningTotal = topVal;
    }
    const yStart = Math.round(priceToY(bottomVal, bounds));
    const yEnd = Math.round(priceToY(topVal, bounds));
    const yTop = Math.min(yStart, yEnd);
    const height = Math.max(2, Math.abs(yEnd - yStart));
    if (typeof ctx.createLinearGradient === "function") {
      const barGradient = ctx.createLinearGradient(0, yTop, 0, yTop + height);
      barGradient.addColorStop(0, color);
      barGradient.addColorStop(1, colorWithAlpha(color, 0.7));
      ctx.fillStyle = barGradient;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fillRect(leftX, yTop, barWidth, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(leftX, yTop, barWidth, height);
    }
    if (i > 0) {
      const prevRightX = Math.round(indexToX(i - 1, count, bounds) + barWidth / 2);
      ctx.strokeStyle = connectorColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(prevRightX, prevY);
      ctx.lineTo(leftX, prevY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    prevY = yEnd;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    const valueStr = b.isTotal ? `$${b.value.toLocaleString()}` : `${b.value >= 0 ? "+" : ""}$${b.value.toLocaleString()}`;
    ctx.fillText(valueStr, centerX, yTop - 6);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText(b.label, centerX, bounds.chartHeight - bounds.padding.bottom + 14);
    ctx.font = "bold 9px Inter, monospace";
  }
  ctx.restore();
}

// src/components/VortexWaterfallChart.tsx
import { jsx as jsx20, jsxs as jsxs20 } from "react/jsx-runtime";
var VortexWaterfallChart = ({
  data,
  height = 360,
  className = "",
  positiveColor = "#10b981",
  negativeColor = "#f43f5e",
  totalColor = "#38bdf8",
  connectorColor = "rgba(255, 255, 255, 0.2)",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState20(null);
  const [cursorPos, setCursorPos] = useState20(null);
  const bounds = useMemo18(() => {
    let running = 0;
    const values = [0];
    data.forEach((b) => {
      if (b.isTotal) {
        running = b.value;
      } else {
        running += b.value;
      }
      values.push(running);
    });
    return computeBounds(values, containerWidth, height, { allowZeroOrNegative: true });
  }, [data, containerWidth, height]);
  useEffect22(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds);
    drawWaterfallChart(ctx, data, bounds, {
      positiveColor: theme.colors?.bullish ?? positiveColor,
      negativeColor: theme.colors?.bearish ?? negativeColor,
      totalColor,
      connectorColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, positiveColor, negativeColor, totalColor, connectorColor, showWatermark, theme, canvasRef]);
  useEffect22(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIndex !== null && data[hoverIndex]) {
      const b = data[hoverIndex];
      const snapX = indexToX(hoverIndex, data.length, bounds);
      const snapY = priceToY(b.value, bounds);
      const color = b.isTotal ? totalColor : b.value >= 0 ? theme.colors?.bullish ?? positiveColor : theme.colors?.bearish ?? negativeColor;
      drawGenericCrosshair(ctx, bounds, {
        mouseX: snapX,
        mouseY: snapY,
        snapX,
        snapY,
        xLabel: b.label,
        yLabel: `$${formatPrice(b.value)}`,
        color,
        showSnapDot: true
      });
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIndex, data, positiveColor, negativeColor, totalColor, theme]);
  const handlePointerMove = (e) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPos({ x: mouseX, y: mouseY });
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };
  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  return /* @__PURE__ */ jsxs20(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx20(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx20("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && cursorPos && /* @__PURE__ */ jsxs20(
          "div",
          {
            className: "pointer-events-none absolute z-30 flex flex-col gap-1 rounded-xl border border-white/15 bg-[#020616]/95 px-3.5 py-2 text-xs backdrop-blur-xl shadow-2xl font-mono text-zinc-300",
            style: {
              left: Math.min(containerWidth - 170, Math.max(10, cursorPos.x + 14)),
              top: Math.min(height - 70, Math.max(10, cursorPos.y - 45))
            },
            children: [
              /* @__PURE__ */ jsxs20("div", { className: "flex items-center justify-between gap-3 border-b border-white/10 pb-1", children: [
                /* @__PURE__ */ jsx20("span", { className: "font-semibold text-white", children: hovered.label }),
                /* @__PURE__ */ jsx20("span", { className: `text-[10px] font-bold ${hovered.isTotal ? "text-sky-400" : hovered.value >= 0 ? "text-emerald-400" : "text-rose-400"}`, children: hovered.isTotal ? "STAGE TOTAL" : hovered.value >= 0 ? "+CONTRIBUTION" : "-COST" })
              ] }),
              /* @__PURE__ */ jsxs20("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx20("span", { className: "text-zinc-400", children: "Delta:" }),
                /* @__PURE__ */ jsxs20("strong", { className: "text-white", children: [
                  hovered.isTotal ? "" : hovered.value >= 0 ? "+" : "",
                  "$",
                  formatPrice(hovered.value)
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
};

// src/components/VortexRadarChart.tsx
import { useEffect as useEffect23, useMemo as useMemo19 } from "react";

// src/engine/radar.ts
function drawRadarChart(ctx, dimensions, seriesList, bounds, options = {}) {
  if (!dimensions || dimensions.length < 3 || !seriesList || seriesList.length === 0) return;
  const {
    levels = 4,
    gridColor = "rgba(255, 255, 255, 0.08)",
    labelColor = "#94a3b8",
    showValues = true
  } = options;
  const numAxes = dimensions.length;
  const centerX = bounds.chartWidth / 2;
  const centerY = bounds.chartHeight / 2;
  const maxRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 32;
  if (maxRadius <= 10) return;
  const angleStep = Math.PI * 2 / numAxes;
  ctx.save();
  for (let lvl = 1; lvl <= levels; lvl++) {
    const ratio = lvl / levels;
    const r = ratio * maxRadius;
    ctx.strokeStyle = lvl === levels ? "rgba(255, 255, 255, 0.15)" : gridColor;
    ctx.lineWidth = lvl === levels ? 1.5 : 1;
    ctx.fillStyle = lvl % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "transparent";
    ctx.beginPath();
    for (let a = 0; a < numAxes; a++) {
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (showValues) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "8px Inter, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${Math.round(ratio * 100)}`, centerX, centerY - r - 2);
    }
  }
  for (let a = 0; a < numAxes; a++) {
    const angle = a * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * maxRadius;
    const y = centerY + Math.sin(angle) * maxRadius;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
    const labelDist = maxRadius + 18;
    const lx = centerX + Math.cos(angle) * labelDist;
    const ly = centerY + Math.sin(angle) * labelDist;
    ctx.fillStyle = labelColor;
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.1 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(dimensions[a].name, lx, ly);
  }
  const defaultColors = ["#38bdf8", "#10b981", "#c084fc", "#eab308"];
  seriesList.forEach((series, sIdx) => {
    const color = series.color ?? defaultColors[sIdx % defaultColors.length];
    const fillOpacity = series.fillOpacity ?? 0.22;
    ctx.beginPath();
    for (let a = 0; a < numAxes; a++) {
      const maxVal = dimensions[a].max ?? 100;
      const rawVal = series.values[a] ?? 0;
      const ratio = Math.max(0, Math.min(1, rawVal / maxVal));
      const r = ratio * maxRadius;
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = colorWithAlpha(color, fillOpacity);
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let a = 0; a < numAxes; a++) {
      const maxVal = dimensions[a].max ?? 100;
      const rawVal = series.values[a] ?? 0;
      const ratio = Math.max(0, Math.min(1, rawVal / maxVal));
      const r = ratio * maxRadius;
      const angle = a * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(color, 0.25);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });
  ctx.restore();
}

// src/components/VortexRadarChart.tsx
import { jsx as jsx21, jsxs as jsxs21 } from "react/jsx-runtime";
var DEFAULT_SERIES_COLORS2 = [
  "#38bdf8",
  "#10b981",
  "#f43f5e",
  "#c084fc",
  "#eab308"
];
var VortexRadarChart = ({
  dimensions,
  series,
  height = 360,
  className = "",
  levels = 4,
  gridColor = "rgba(255, 255, 255, 0.08)",
  labelColor = "#94a3b8",
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const normalizedSeries = useMemo19(() => {
    return series.map((s, idx) => ({
      ...s,
      color: s.color || DEFAULT_SERIES_COLORS2[idx % DEFAULT_SERIES_COLORS2.length]
    }));
  }, [series]);
  const bounds = useMemo19(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);
  useEffect23(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawRadarChart(ctx, dimensions, normalizedSeries, bounds, {
      levels,
      gridColor,
      labelColor
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, dimensions, normalizedSeries, levels, gridColor, labelColor, showWatermark, theme, canvasRef]);
  return /* @__PURE__ */ jsxs21(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx21("div", { className: "absolute top-2.5 right-4 z-20 flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md", children: normalizedSeries.map((s) => /* @__PURE__ */ jsxs21("div", { className: "flex items-center gap-1.5 text-xs", children: [
          /* @__PURE__ */ jsx21("span", { className: "h-2 w-2 rounded-full", style: { backgroundColor: s.color } }),
          /* @__PURE__ */ jsx21("span", { className: "text-zinc-300 font-mono text-[11px]", children: s.name })
        ] }, s.name)) }),
        /* @__PURE__ */ jsx21(
          "canvas",
          {
            ref: canvasRef,
            className: "block h-full w-full",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx21("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" })
      ]
    }
  );
};

// src/components/VortexPieChart.tsx
import { useEffect as useEffect24, useMemo as useMemo20, useState as useState21 } from "react";

// src/engine/pie.ts
function drawPieChart(ctx, slices, bounds, options = {}) {
  if (!slices || slices.length === 0) return;
  const {
    donutHole = 0.55,
    hoverIndex = null,
    borderColor = "#020616",
    showLabels = true
  } = options;
  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  if (total <= 0) return;
  const centerX = bounds.chartWidth / 2;
  const centerY = bounds.chartHeight / 2;
  const outerRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 24;
  const innerRadius = outerRadius * donutHole;
  if (outerRadius <= 10) return;
  const defaultPalette = [
    "#38bdf8",
    // Cyan
    "#10b981",
    // Emerald
    "#f43f5e",
    // Rose
    "#c084fc",
    // Purple
    "#eab308",
    // Yellow
    "#f97316",
    // Orange
    "#06b6d4"
    // Sky
  ];
  ctx.save();
  let startAngle = -Math.PI / 2;
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const val = Math.max(0, s.value);
    const sliceAngle = val / total * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const isHovered = hoverIndex === i;
    const midAngle = startAngle + sliceAngle / 2;
    const offset = isHovered ? 10 : 0;
    const cx = centerX + Math.cos(midAngle) * offset;
    const cy = centerY + Math.sin(midAngle) * offset;
    const color = s.color ?? defaultPalette[i % defaultPalette.length];
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    } else {
      ctx.lineTo(cx, cy);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (isHovered) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (showLabels && sliceAngle > 0.22) {
      const labelRadius = (innerRadius + outerRadius) / 2;
      const lx = cx + Math.cos(midAngle) * labelRadius;
      const ly = cy + Math.sin(midAngle) * labelRadius;
      const percent = Math.round(val / total * 100);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${percent}%`, lx, ly);
    }
    startAngle = endAngle;
  }
  if (innerRadius >= 30) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (hoverIndex !== null && slices[hoverIndex]) {
      const hSlice = slices[hoverIndex];
      const hPercent = Math.round(Math.max(0, hSlice.value) / total * 100);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillText(`${hPercent}%`, centerX, centerY - 6);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(hSlice.label, centerX, centerY + 12);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.fillText("100%", centerX, centerY - 5);
      ctx.fillStyle = "#64748b";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText("PORTFOLIO", centerX, centerY + 10);
    }
  }
  ctx.restore();
}

// src/components/VortexPieChart.tsx
import { jsx as jsx22, jsxs as jsxs22 } from "react/jsx-runtime";
var VortexPieChart = ({
  data,
  height = 360,
  className = "",
  donut = true,
  donutHole = 0.55,
  borderColor = "#020616",
  showLabels = true,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState21(null);
  const total = useMemo20(() => {
    return data.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  }, [data]);
  const bounds = useMemo20(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);
  const effectiveHole = donut ? donutHole : 0;
  useEffect24(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawPieChart(ctx, data, bounds, {
      donutHole: effectiveHole,
      hoverIndex,
      borderColor,
      showLabels
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, effectiveHole, hoverIndex, borderColor, showLabels, showWatermark, theme, canvasRef]);
  const handlePointerMove = (e) => {
    if (total <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = bounds.chartWidth / 2;
    const centerY = bounds.chartHeight / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const dist = Math.hypot(dx, dy);
    const outerRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 20;
    const innerRadius = outerRadius * effectiveHole;
    if (dist < innerRadius || dist > outerRadius) {
      setHoverIndex(null);
      return;
    }
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += Math.PI * 2;
    }
    let currentAngle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const sliceAngle = Math.max(0, data[i].value) / total * (Math.PI * 2);
      if (angle >= currentAngle && angle <= currentAngle + sliceAngle) {
        setHoverIndex(i);
        return;
      }
      currentAngle += sliceAngle;
    }
    setHoverIndex(null);
  };
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredPct = hovered && total > 0 ? (Math.max(0, hovered.value) / total * 100).toFixed(1) : null;
  return /* @__PURE__ */ jsxs22(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx22(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoverIndex(null),
            className: "block h-full w-full cursor-pointer",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx22("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hovered && /* @__PURE__ */ jsxs22("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          /* @__PURE__ */ jsxs22("span", { className: "font-semibold text-white", children: [
            hovered.label,
            ":"
          ] }),
          /* @__PURE__ */ jsxs22("span", { children: [
            "Value: ",
            /* @__PURE__ */ jsxs22("strong", { className: "text-white", children: [
              "$",
              formatPrice(hovered.value)
            ] })
          ] }),
          /* @__PURE__ */ jsxs22("span", { className: "text-sky-400 font-semibold", children: [
            "(",
            hoveredPct,
            "%)"
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexChoroplethMap.tsx
import { useEffect as useEffect25, useMemo as useMemo21, useState as useState22 } from "react";

// src/engine/choropleth.ts
function drawChoropleth(ctx, regions, bounds, options = {}) {
  if (!regions || regions.length === 0) return;
  const defaultColorScale = (r) => {
    const alpha = 0.2 + Math.max(0, Math.min(1, r)) * 0.75;
    return `rgba(56, 189, 248, ${alpha})`;
  };
  const {
    colorScale = defaultColorScale,
    borderColor = "rgba(255, 255, 255, 0.25)",
    showLabels = true
  } = options;
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const r of regions) {
    if (r.value < minVal) minVal = r.value;
    if (r.value > maxVal) maxVal = r.value;
  }
  const range = Math.max(maxVal - minVal, 1e-4);
  ctx.save();
  ctx.lineWidth = 1;
  for (const region of regions) {
    const ratio = (region.value - minVal) / range;
    const fillColor = colorScale(ratio);
    for (const poly of region.polygons) {
      if (!poly.points || poly.points.length < 3) continue;
      ctx.beginPath();
      for (let i = 0; i < poly.points.length; i++) {
        const [nx, ny] = poly.points[i];
        const screenX = bounds.padding.left + nx * bounds.plotWidth;
        const screenY = bounds.padding.top + ny * bounds.plotHeight;
        if (i === 0) ctx.moveTo(screenX, screenY);
        else ctx.lineTo(screenX, screenY);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.stroke();
    }
    if (showLabels && region.polygons.length > 0 && region.polygons[0].points.length > 0) {
      const pts = region.polygons[0].points;
      let sumX = 0, sumY = 0;
      for (const p of pts) {
        sumX += p[0];
        sumY += p[1];
      }
      const cx = bounds.padding.left + sumX / pts.length * bounds.plotWidth;
      const cy = bounds.padding.top + sumY / pts.length * bounds.plotHeight;
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(region.name, cx, cy);
    }
  }
  ctx.restore();
}

// src/components/VortexChoroplethMap.tsx
import { jsx as jsx23, jsxs as jsxs23 } from "react/jsx-runtime";
var VortexChoroplethMap = ({
  regions,
  height = 380,
  className = "",
  borderColor = "rgba(255, 255, 255, 0.25)",
  showLabels = true,
  showWatermark = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoveredRegion, setHoveredRegion] = useState22(null);
  const bounds = useMemo21(() => {
    return computeBounds([0, 100], containerWidth, height);
  }, [containerWidth, height]);
  useEffect25(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawChoropleth(ctx, regions, bounds, {
      borderColor,
      showLabels
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, regions, borderColor, showLabels, showWatermark, theme, canvasRef]);
  const handlePointerMove = (e) => {
    if (!regions || regions.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let hit = null;
    for (const region of regions) {
      for (const poly of region.polygons) {
        let inside = false;
        const pts = poly.points;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = bounds.padding.left + pts[i][0] * bounds.plotWidth;
          const yi = bounds.padding.top + pts[i][1] * bounds.plotHeight;
          const xj = bounds.padding.left + pts[j][0] * bounds.plotWidth;
          const yj = bounds.padding.top + pts[j][1] * bounds.plotHeight;
          const intersect = yi > mouseY !== yj > mouseY && mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        if (inside) {
          hit = region;
          break;
        }
      }
      if (hit) break;
    }
    setHoveredRegion(hit);
  };
  return /* @__PURE__ */ jsxs23(
    "div",
    {
      ref: containerRef,
      className: `relative w-full overflow-hidden select-none group ${className}`,
      style: { height },
      children: [
        /* @__PURE__ */ jsx23(
          "canvas",
          {
            ref: canvasRef,
            onPointerMove: handlePointerMove,
            onPointerLeave: () => setHoveredRegion(null),
            className: "block h-full w-full cursor-crosshair",
            style: { touchAction: "none" }
          }
        ),
        /* @__PURE__ */ jsx23("canvas", { ref: overlayRef, className: "pointer-events-none absolute inset-0 block" }),
        hoveredRegion && /* @__PURE__ */ jsxs23("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300", children: [
          /* @__PURE__ */ jsx23("span", { className: "font-semibold text-white", children: hoveredRegion.name }),
          /* @__PURE__ */ jsxs23("span", { children: [
            "Value: ",
            /* @__PURE__ */ jsxs23("strong", { className: "text-sky-400", children: [
              "$",
              formatPrice(hoveredRegion.value)
            ] })
          ] })
        ] })
      ]
    }
  );
};

// src/components/VortexWhaleBiasChart.tsx
import { useEffect as useEffect26, useMemo as useMemo22, useState as useState23 } from "react";

// src/engine/bias.ts
var DEFAULT_BIAS_PADDING = {
  top: 14,
  bottom: 22,
  left: 38,
  right: 18
};
function computeBiasBounds(width, height, padding = DEFAULT_BIAS_PADDING) {
  const minPrice = 0;
  const maxPrice = 100;
  const priceRange = 100;
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
function getBiasPointCoords(points, bounds) {
  if (points.length === 0) return [];
  const t0 = points[0].scannedAt;
  const t1 = points[points.length - 1].scannedAt || t0 + 1;
  const span = Math.max(1, t1 - t0);
  return points.map((p) => {
    const frac = (p.scannedAt - t0) / span;
    const x = bounds.padding.left + frac * bounds.plotWidth;
    const y = priceToY(Math.max(0, Math.min(100, p.callPct)), bounds);
    return { x, y, point: p };
  });
}
function traceBiasSpline(ctx, coords) {
  if (coords.length < 2) return;
  if (coords.length === 2) {
    ctx.moveTo(coords[0].x, coords[0].y);
    ctx.lineTo(coords[1].x, coords[1].y);
    return;
  }
  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}
function formatBiasTime(ms) {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function drawWhaleBiasChart(ctx, points, bounds, options = {}) {
  if (!points || points.length < 2) return;
  const {
    bullishColor = "#10b981",
    bearishColor = "#f43f5e",
    equilibriumValue = 50,
    lineWidth = 2.5,
    showEquilibrium = true,
    showBeacon = true,
    showGrid = true
  } = options;
  const { padding, plotWidth, plotHeight, chartWidth, chartHeight } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const yEq = priceToY(equilibriumValue, bounds);
  const coords = getBiasPointCoords(points, bounds);
  if (coords.length < 2) return;
  ctx.save();
  if (showGrid) {
    const gridLevels = [0, 25, 50, 75, 100];
    gridLevels.forEach((lvl) => {
      const y = priceToY(lvl, bounds);
      const isEq = lvl === equilibriumValue;
      ctx.beginPath();
      ctx.strokeStyle = isEq ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = isEq ? 1.5 : 1;
      if (isEq) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(padding.left, y);
      ctx.lineTo(rightAxisX, y);
      ctx.stroke();
      if (lvl === 0 || lvl === 50 || lvl === 100) {
        ctx.font = "bold 9px Inter, -apple-system, sans-serif";
        ctx.fillStyle = "#71717a";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${lvl}%`, padding.left - 6, y);
      }
    });
    ctx.setLineDash([]);
    if (showEquilibrium) {
      ctx.font = "bold 8px Inter, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${equilibriumValue}% EQUILIBRIUM`, rightAxisX, yEq - 4);
    }
    const t0 = points[0].scannedAt;
    const t1 = points[points.length - 1].scannedAt;
    const tMid = t0 + (t1 - t0) / 2;
    ctx.font = "500 9px Inter, -apple-system, sans-serif";
    ctx.fillStyle = "#71717a";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(formatBiasTime(t0), padding.left, bottomAxisY + 6);
    ctx.textAlign = "center";
    ctx.fillText(formatBiasTime(tMid), padding.left + plotWidth / 2, bottomAxisY + 6);
    ctx.textAlign = "right";
    ctx.fillText(formatBiasTime(t1), rightAxisX, bottomAxisY + 6);
  }
  const first = coords[0];
  const last = coords[coords.length - 1];
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left, padding.top, plotWidth, Math.max(0, yEq - padding.top));
  ctx.clip();
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.lineTo(last.x, yEq);
  ctx.lineTo(first.x, yEq);
  ctx.closePath();
  const gradUpper = ctx.createLinearGradient(0, padding.top, 0, yEq);
  gradUpper.addColorStop(0, colorWithAlpha(bullishColor, 0.22));
  gradUpper.addColorStop(1, colorWithAlpha(bullishColor, 0.02));
  ctx.fillStyle = gradUpper;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left, yEq, plotWidth, Math.max(0, bottomAxisY - yEq));
  ctx.clip();
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.lineTo(last.x, yEq);
  ctx.lineTo(first.x, yEq);
  ctx.closePath();
  const gradLower = ctx.createLinearGradient(0, yEq, 0, bottomAxisY);
  gradLower.addColorStop(0, colorWithAlpha(bearishColor, 0.02));
  gradLower.addColorStop(1, colorWithAlpha(bearishColor, 0.22));
  ctx.fillStyle = gradLower;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left - 4, padding.top - 4, plotWidth + 8, Math.max(0, yEq - padding.top + 4));
  ctx.clip();
  ctx.shadowColor = colorWithAlpha(bullishColor, 0.65);
  ctx.shadowBlur = 7;
  ctx.strokeStyle = bullishColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding.left - 4, yEq, plotWidth + 8, Math.max(0, bottomAxisY - yEq + 4));
  ctx.clip();
  ctx.shadowColor = colorWithAlpha(bearishColor, 0.65);
  ctx.shadowBlur = 7;
  ctx.strokeStyle = bearishColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  traceBiasSpline(ctx, coords);
  ctx.stroke();
  ctx.restore();
  if (showBeacon && coords.length > 0) {
    const isBull = last.point.callPct >= equilibriumValue;
    const beaconColor = isBull ? bullishColor : bearishColor;
    ctx.save();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(beaconColor, 0.25);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(beaconColor, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// src/components/VortexWhaleBiasChart.tsx
import { jsx as jsx24, jsxs as jsxs24 } from "react/jsx-runtime";
var VortexWhaleBiasChart = ({
  points,
  height = 180,
  className = "",
  label,
  showWatermark = false,
  showEquilibrium = true,
  theme = {}
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIdx, setHoverIdx] = useState23(null);
  const sortedPoints = useMemo22(() => {
    if (!points || points.length === 0) return [];
    return Array.from(new Map(points.map((p) => [p.scannedAt, p])).values()).sort(
      (a, b) => a.scannedAt - b.scannedAt
    );
  }, [points]);
  const bounds = useMemo22(() => {
    return computeBiasBounds(containerWidth, height);
  }, [containerWidth, height]);
  const coords = useMemo22(() => {
    return getBiasPointCoords(sortedPoints, bounds);
  }, [sortedPoints, bounds]);
  const bullishColor = theme.colors?.bullish ?? "#10b981";
  const bearishColor = theme.colors?.bearish ?? "#f43f5e";
  useEffect26(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedPoints.length < 2) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawWhaleBiasChart(ctx, sortedPoints, bounds, {
      bullishColor,
      bearishColor,
      equilibriumValue: 50,
      lineWidth: 2.5,
      showEquilibrium,
      showBeacon: true,
      showGrid: true
    });
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, sortedPoints, bounds, bullishColor, bearishColor, showEquilibrium, showWatermark, canvasRef]);
  useEffect26(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const setup = setupCanvasDpi(overlay, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    if (hoverIdx !== null && coords[hoverIdx]) {
      const active = coords[hoverIdx];
      const isBull = active.point.callPct >= 50;
      const dotColor = isBull ? bullishColor : bearishColor;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.moveTo(active.x, bounds.padding.top);
      ctx.lineTo(active.x, bounds.chartHeight - bounds.padding.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.moveTo(bounds.padding.left, active.y);
      ctx.lineTo(active.x, active.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(active.x, active.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(active.x, active.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(active.x, active.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  }, [overlayRef, containerWidth, height, bounds, hoverIdx, coords, bullishColor, bearishColor]);
  const handlePointerMove = (e) => {
    if (coords.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const diff = Math.abs(coords[i].x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIdx(closestIdx);
  };
  const handlePointerLeave = () => {
    setHoverIdx(null);
  };
  const activeCoord = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;
  const activePoint = activeCoord?.point ?? null;
  const tooltipStyle = useMemo22(() => {
    if (!activeCoord || containerWidth <= 0) return {};
    const pctLeft = activeCoord.x / containerWidth * 100;
    let translateX = "-50%";
    if (pctLeft < 18) translateX = "0%";
    if (pctLeft > 82) translateX = "-100%";
    return {
      left: `${pctLeft}%`,
      transform: `translateX(${translateX})`
    };
  }, [activeCoord, containerWidth]);
  if (sortedPoints.length < 2) {
    return /* @__PURE__ */ jsx24(
      "div",
      {
        className: `flex items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-4 text-xs text-zinc-400 ${className}`,
        style: { height },
        children: "No intraday whale history yet for this ticker (data accrues during active market hours)."
      }
    );
  }
  return /* @__PURE__ */ jsxs24("div", { className: `space-y-1.5 ${className}`, children: [
    /* @__PURE__ */ jsxs24(
      "div",
      {
        ref: containerRef,
        className: "relative w-full overflow-hidden select-none rounded-2xl border border-white/[0.08] bg-black/40 p-1 backdrop-blur-md",
        style: { height },
        children: [
          /* @__PURE__ */ jsx24(
            "canvas",
            {
              ref: canvasRef,
              className: "block h-full w-full cursor-crosshair",
              style: { touchAction: "none" }
            }
          ),
          /* @__PURE__ */ jsx24(
            "canvas",
            {
              ref: overlayRef,
              onPointerMove: handlePointerMove,
              onPointerLeave: handlePointerLeave,
              className: "absolute inset-0 block h-full w-full cursor-crosshair",
              style: { touchAction: "none" }
            }
          ),
          activePoint && /* @__PURE__ */ jsxs24(
            "div",
            {
              className: "pointer-events-none absolute top-2 z-20 rounded-xl border border-white/15 bg-[#0b0c10]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl transition-all",
              style: tooltipStyle,
              children: [
                /* @__PURE__ */ jsxs24("div", { className: "flex items-center gap-2 border-b border-white/10 pb-1 font-bold text-white", children: [
                  /* @__PURE__ */ jsx24("span", { children: formatBiasTime(activePoint.scannedAt) }),
                  /* @__PURE__ */ jsx24(
                    "span",
                    {
                      className: `text-[10px] px-1.5 py-0.5 rounded font-bold ${activePoint.callPct >= 55 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : activePoint.callPct <= 45 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`,
                      children: activePoint.callPct >= 55 ? "Bullish" : activePoint.callPct <= 45 ? "Bearish" : "Neutral"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs24("div", { className: "mt-1.5 space-y-1 tabular-nums", children: [
                  /* @__PURE__ */ jsxs24("div", { className: "flex items-center justify-between gap-4 text-[11px]", children: [
                    /* @__PURE__ */ jsxs24("span", { className: "font-semibold text-emerald-400", children: [
                      activePoint.callPct,
                      "% Calls"
                    ] }),
                    /* @__PURE__ */ jsxs24("span", { className: "font-semibold text-rose-400", children: [
                      100 - activePoint.callPct,
                      "% Puts"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx24("div", { className: "h-1.5 w-32 overflow-hidden rounded-full bg-rose-500/30", children: /* @__PURE__ */ jsx24(
                    "div",
                    {
                      className: "h-full rounded-full bg-emerald-400 transition-all duration-75",
                      style: { width: `${activePoint.callPct}%` }
                    }
                  ) })
                ] })
              ]
            }
          )
        ]
      }
    ),
    label && /* @__PURE__ */ jsx24("div", { className: "text-[11px] text-zinc-400 font-medium px-1", children: label })
  ] });
};
export {
  VORTEX_THEME,
  VortexAreaChart,
  VortexBarChart,
  VortexBoxPlot,
  VortexCandleChart,
  VortexChartControls,
  VortexChoroplethMap,
  VortexConeChart,
  VortexFootprintChart,
  VortexHeatmap,
  VortexHeikinAshiChart,
  VortexLineChart,
  VortexMultiLineChart,
  VortexOhlcChart,
  VortexPieChart,
  VortexPointFigureChart,
  VortexRadarChart,
  VortexRangeBarChart,
  VortexRangeChart,
  VortexRenkoChart,
  VortexScatterPlot,
  VortexVolumeProfileChart,
  VortexWaterfallChart,
  VortexWatermarkOverlay,
  VortexWhaleBiasChart,
  colorWithAlpha,
  computeBarBounds,
  computeBiasBounds,
  computeBoxPlotStats,
  computeHeikinAshi,
  computePointAndFigure,
  computeRangeBars,
  computeRenkoBricks,
  computeScatterBounds,
  computeVolumeProfile,
  computeZoneRect,
  createTailViewport,
  createViewport,
  drawAreaChart,
  drawBarChart,
  drawBarHoverBand,
  drawBoxPlot,
  drawChartZones,
  drawChoropleth,
  drawCrosshair,
  drawFootprintChart,
  drawGenericCrosshair,
  drawHeatmap,
  drawLineChart,
  drawOhlcBars,
  drawPieChart,
  drawPointAndFigure,
  drawRadarChart,
  drawRenkoBricks,
  drawRulerOverlay,
  drawScatterPlot,
  drawVolumeProfile,
  drawVortexWatermark,
  drawWaterfallChart,
  drawWhaleBiasChart,
  followViewport,
  formatCandleTime,
  formatChange,
  formatPrice,
  formatVolume,
  getBiasPointCoords,
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
};
//# sourceMappingURL=index.js.map