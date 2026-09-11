"use client";

// src/components/VortexCandleChart.tsx
import { useEffect, useRef, useState, useMemo, useCallback } from "react";

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
  const validPrices = prices.filter((p) => typeof p === "number" && !isNaN(p) && p > 0);
  let min = validPrices.length > 0 ? Math.min(...validPrices) : 100;
  let max = validPrices.length > 0 ? Math.max(...validPrices) : 105;
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

// src/utils/chart-defaults.ts
function formatCandleTime(timestampMs, isIntraday = false) {
  const d = new Date(timestampMs);
  if (isIntraday) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  return d.toISOString().slice(0, 10);
}
function formatPrice(price) {
  if (isNaN(price)) return "\u2014";
  return price.toFixed(2);
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
function drawCandlesticks(ctx, candles, bounds, style = DEFAULT_CANDLE_STYLE) {
  if (candles.length === 0) return;
  const count = candles.length;
  const candleSlotWidth = bounds.plotWidth / count;
  const candleBodyWidth = Math.max(2, Math.min(22, Math.floor(candleSlotWidth * 0.72)));
  ctx.save();
  candles.forEach((c, idx) => {
    const x = Math.round(indexToX(idx, count, bounds));
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
      const textWidth = ctx.measureText(line.title).width;
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
      const labelWidth = ctx.measureText(labelText).width;
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
  const vortexWidth = ctx.measureText("VorteX").width;
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
function drawCrosshair(ctx, bounds, hover, cursorPrice, timeText) {
  const { chartWidth, chartHeight, padding } = bounds;
  const rightAxisX = chartWidth - padding.right;
  const bottomAxisY = chartHeight - padding.bottom;
  const { mouseX, mouseY } = hover;
  if (mouseX < padding.left || mouseX > rightAxisX || mouseY < padding.top || mouseY > bottomAxisY) {
    return;
  }
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mouseX + 0.5, padding.top);
  ctx.lineTo(mouseX + 0.5, bottomAxisY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding.left, mouseY + 0.5);
  ctx.lineTo(rightAxisX, mouseY + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const priceText = `$${formatPrice(cursorPrice)}`;
  const textW = ctx.measureText(priceText).width;
  const pillW = textW + 10;
  const pillH = 16;
  const pillX = rightAxisX + 4;
  const pillY = Math.round(mouseY - pillH / 2);
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceText, pillX + pillW / 2, pillY + pillH / 2);
  if (timeText) {
    ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const timeW = ctx.measureText(timeText).width + 12;
    const timeH = 16;
    const timeX = Math.round(mouseX - timeW / 2);
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
  const textWidth = ctx.measureText(fullText).width;
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
        isZoomed && /* @__PURE__ */ jsxs2("span", { className: "mr-1 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-400/30", children: [
          zoomLevel,
          "x"
        ] }),
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
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  return { ctx, dpr };
}

// src/components/VortexCandleChart.tsx
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
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
  theme = {}
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [hover, setHover] = useState(null);
  const sortedCandles = useMemo(() => {
    return Array.from(
      new Map(candles.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles]);
  const [viewport, setViewport] = useState(
    () => createViewport(sortedCandles.length, 6)
  );
  useEffect(() => {
    setViewport((prev) => {
      if (prev.totalCount === sortedCandles.length) return prev;
      return createViewport(sortedCandles.length, 6);
    });
  }, [sortedCandles.length]);
  const [isRulerToolActive, setIsRulerToolActive] = useState(false);
  const [ruler, setRuler] = useState({
    active: false,
    startPoint: null,
    currentPoint: null
  });
  const dragRef = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    initialViewport: createViewport(0)
  });
  const mergedColors = useMemo(() => ({ ...VORTEX_THEME.colors, ...theme.colors || {} }), [theme]);
  const visibleCandles = useMemo(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);
  const allLines = useMemo(() => {
    const list = [...priceLines];
    if (typeof swingHigh === "number" && swingHigh > 0) {
      list.push({
        price: swingHigh,
        color: mergedColors.bearish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D High $${formatPrice(swingHigh)}`,
        axisLabelVisible: true
      });
    }
    if (typeof swingLow === "number" && swingLow > 0) {
      list.push({
        price: swingLow,
        color: mergedColors.bullish,
        lineWidth: 1,
        lineStyle: "dashed",
        title: `20D Low $${formatPrice(swingLow)}`,
        axisLabelVisible: true
      });
    }
    if (typeof spotPrice === "number" && spotPrice > 0) {
      list.push({
        price: spotPrice,
        color: mergedColors.spot,
        lineWidth: 2,
        lineStyle: "solid",
        title: `Spot $${formatPrice(spotPrice)}`,
        axisLabelVisible: true
      });
    }
    if (atrBounds?.upper && atrBounds.upper > 0) {
      list.push({
        price: atrBounds.upper,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Upper",
        axisLabelVisible: false
      });
    }
    if (atrBounds?.lower && atrBounds.lower > 0) {
      list.push({
        price: atrBounds.lower,
        color: "rgba(234, 179, 8, 0.75)",
        lineWidth: 1,
        lineStyle: "dotted",
        title: "ATR Lower",
        axisLabelVisible: false
      });
    }
    return list;
  }, [priceLines, swingHigh, swingLow, spotPrice, atrBounds, mergedColors]);
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
  const bounds = useMemo(() => {
    const prices = [];
    visibleCandles.forEach((c) => {
      prices.push(c.high, c.low);
    });
    allLines.forEach((l) => {
      if (typeof l.price === "number") prices.push(l.price);
    });
    return computeBounds(prices, containerWidth, height);
  }, [visibleCandles, allLines, containerWidth, height]);
  const timeLabels = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));
    const labels = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(i, count, bounds);
      const text = formatCandleTime(c.t, isIntraday);
      labels.push({ x, text });
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds, isIntraday]);
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);
  const handleZoomOut = useCallback(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);
  const handleReset = useCallback(() => {
    setViewport(resetViewport(sortedCandles.length, 6));
    setRuler({ active: false, startPoint: null, currentPoint: null });
  }, [sortedCandles.length]);
  const toggleRuler = useCallback(() => {
    setIsRulerToolActive((prev) => {
      if (prev) {
        setRuler({ active: false, startPoint: null, currentPoint: null });
      }
      return !prev;
    });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const anchorRatio = (mouseX - bounds.padding.left) / bounds.plotWidth;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      setViewport((prev) => zoomViewport(prev, factor, anchorRatio));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [bounds.padding.left, bounds.plotWidth]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;
    ctx.clearRect(0, 0, containerWidth, height);
    drawGridAndAxes(ctx, bounds, timeLabels);
    drawCandlesticks(ctx, visibleCandles, bounds, {
      upColor: mergedColors.bullish,
      downColor: mergedColors.bearish
    });
    drawPriceLines(ctx, allLines, bounds);
    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }
    if (hover && hover.candle && !ruler.active) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, isIntraday);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    visibleCandles,
    allLines,
    timeLabels,
    hover,
    ruler,
    showWatermark,
    mergedColors,
    isIntraday
  ]);
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);
    if (e.shiftKey || isRulerToolActive) {
      const point = {
        x: mouseX,
        y: mouseY,
        price,
        time: candle?.t,
        index: viewport.startIndex + localIdx
      };
      setRuler({
        active: true,
        startPoint: point,
        currentPoint: point
      });
    } else {
      dragRef.current = {
        isDragging: true,
        hasMoved: false,
        startX: mouseX,
        initialViewport: viewport
      };
    }
  };
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);
    if (ruler.active && ruler.startPoint) {
      setRuler((prev) => ({
        ...prev,
        currentPoint: {
          x: mouseX,
          y: mouseY,
          price,
          time: candle?.t,
          index: viewport.startIndex + localIdx
        }
      }));
      return;
    }
    if (dragRef.current.isDragging) {
      const deltaX = mouseX - dragRef.current.startX;
      if (Math.abs(deltaX) > 3) {
        dragRef.current.hasMoved = true;
      }
      const barWidth = bounds.plotWidth / Math.max(1, visibleCandles.length);
      const deltaBars = Math.round(deltaX / barWidth);
      setViewport(panViewport(dragRef.current.initialViewport, deltaBars));
      setHover(null);
      return;
    }
    setHover({ mouseX, mouseY, index: localIdx, candle });
  };
  const handleMouseUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
    }
  };
  const handleMouseLeave = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setRuler({ active: false, startPoint: null, currentPoint: null });
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const isZoomed = isViewportZoomed(viewport);
  const zoomLevel = getZoomLevel(viewport);
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
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            onDoubleClick: handleReset,
            className: `block w-full h-full ${ruler.active || isRulerToolActive ? "cursor-crosshair" : dragRef.current.isDragging ? "cursor-grabbing" : isZoomed ? "cursor-grab" : "cursor-crosshair"}`
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ jsx3(
          VortexChartControls,
          {
            onZoomIn: handleZoomIn,
            onZoomOut: handleZoomOut,
            onReset: handleReset,
            isZoomed,
            zoomLevel,
            isRulerActive: isRulerToolActive || ruler.active,
            onToggleRuler: toggleRuler
          }
        ),
        hover && hover.candle && !ruler.active && /* @__PURE__ */ jsxs3("div", { className: "pointer-events-none absolute top-2.5 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl tabular-nums transition-all", children: [
          /* @__PURE__ */ jsx3("span", { className: "font-semibold text-zinc-300", children: formatCandleTime(hover.candle.t, isIntraday) }),
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
import { useEffect as useEffect2, useRef as useRef2, useState as useState2, useMemo as useMemo2, useCallback as useCallback2 } from "react";

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
  const highW = ctx.measureText(highText).width + 8;
  ctx.fillStyle = box.color;
  ctx.beginPath();
  ctx.roundRect(rightAxisX + 3, yHigh - 7, highW, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#020616";
  ctx.fillText(highText, rightAxisX + 3 + highW / 2, yHigh);
  const lowText = `${box.prefix}L $${formatPrice(box.low)}`;
  const lowW = ctx.measureText(lowText).width + 8;
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
  theme = {}
}) => {
  const containerRef = useRef2(null);
  const canvasRef = useRef2(null);
  const [containerWidth, setContainerWidth] = useState2(600);
  const [hover, setHover] = useState2(null);
  const sortedCandles = useMemo2(() => {
    return Array.from(
      new Map(candles.map((c) => [c.t, c])).values()
    ).sort((a, b) => a.t - b.t);
  }, [candles]);
  const [viewport, setViewport] = useState2(
    () => createViewport(sortedCandles.length, 12)
  );
  useEffect2(() => {
    setViewport((prev) => {
      if (prev.totalCount === sortedCandles.length) return prev;
      return createViewport(sortedCandles.length, 12);
    });
  }, [sortedCandles.length]);
  const [isRulerToolActive, setIsRulerToolActive] = useState2(false);
  const [ruler, setRuler] = useState2({
    active: false,
    startPoint: null,
    currentPoint: null
  });
  const dragRef = useRef2({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    initialViewport: createViewport(0)
  });
  const mergedColors = useMemo2(() => ({ ...VORTEX_THEME.colors, ...theme.colors || {} }), [theme]);
  const visibleCandles = useMemo2(() => {
    if (sortedCandles.length === 0) return [];
    const start = Math.max(0, Math.min(viewport.startIndex, sortedCandles.length - 1));
    const end = Math.max(start, Math.min(viewport.endIndex, sortedCandles.length - 1));
    return sortedCandles.slice(start, end + 1);
  }, [sortedCandles, viewport.startIndex, viewport.endIndex]);
  useEffect2(() => {
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
  const bounds = useMemo2(() => {
    const prices = [];
    visibleCandles.forEach((c) => prices.push(c.high, c.low));
    if (priorDay && priorDay.high > 0) prices.push(priorDay.high, priorDay.low);
    if (premarket && premarket.high > 0) prices.push(premarket.high, premarket.low);
    vwapSeries.forEach((v) => {
      if (typeof v.vwap === "number" && v.vwap > 0) prices.push(v.vwap);
    });
    return computeBounds(prices, containerWidth, height);
  }, [visibleCandles, priorDay, premarket, vwapSeries, containerWidth, height]);
  const timeLabels = useMemo2(() => {
    if (visibleCandles.length === 0) return [];
    const count = visibleCandles.length;
    const maxLabels = Math.max(3, Math.min(6, Math.floor(containerWidth / 120)));
    const step = Math.max(1, Math.floor(count / maxLabels));
    const labels = [];
    for (let i = 0; i < count; i += step) {
      const c = visibleCandles[i];
      const x = indexToX(i, count, bounds);
      const text = formatCandleTime(c.t, true);
      labels.push({ x, text });
    }
    return labels;
  }, [visibleCandles, containerWidth, bounds]);
  const vwapPoints = useMemo2(() => {
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
  const handleZoomIn = useCallback2(() => {
    setViewport((prev) => zoomViewport(prev, 1.25, 0.5));
  }, []);
  const handleZoomOut = useCallback2(() => {
    setViewport((prev) => zoomViewport(prev, 0.8, 0.5));
  }, []);
  const handleReset = useCallback2(() => {
    setViewport(resetViewport(sortedCandles.length, 12));
    setRuler({ active: false, startPoint: null, currentPoint: null });
  }, [sortedCandles.length]);
  const toggleRuler = useCallback2(() => {
    setIsRulerToolActive((prev) => {
      if (prev) {
        setRuler({ active: false, startPoint: null, currentPoint: null });
      }
      return !prev;
    });
  }, []);
  useEffect2(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const anchorRatio = (mouseX - bounds.padding.left) / bounds.plotWidth;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      setViewport((prev) => zoomViewport(prev, factor, anchorRatio));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [bounds.padding.left, bounds.plotWidth]);
  useEffect2(() => {
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
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }
    if (hover && hover.candle && !ruler.active) {
      const cursorPrice = yToPrice(hover.mouseY, bounds);
      const timeStr = formatCandleTime(hover.candle.t, true);
      drawCrosshair(ctx, bounds, hover, cursorPrice, timeStr);
    }
  }, [
    containerWidth,
    height,
    bounds,
    visibleCandles,
    priorDay,
    premarket,
    vwapPoints,
    overlayMode,
    timeLabels,
    hover,
    ruler,
    showWatermark,
    mergedColors
  ]);
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);
    if (e.shiftKey || isRulerToolActive) {
      const point = {
        x: mouseX,
        y: mouseY,
        price,
        time: candle?.t,
        index: viewport.startIndex + localIdx
      };
      setRuler({
        active: true,
        startPoint: point,
        currentPoint: point
      });
    } else {
      dragRef.current = {
        isDragging: true,
        hasMoved: false,
        startX: mouseX,
        initialViewport: viewport
      };
    }
  };
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localIdx = xToIndex(mouseX, visibleCandles.length, bounds);
    const candle = visibleCandles[localIdx] || null;
    const price = yToPrice(mouseY, bounds);
    if (ruler.active && ruler.startPoint) {
      setRuler((prev) => ({
        ...prev,
        currentPoint: {
          x: mouseX,
          y: mouseY,
          price,
          time: candle?.t,
          index: viewport.startIndex + localIdx
        }
      }));
      return;
    }
    if (dragRef.current.isDragging) {
      const deltaX = mouseX - dragRef.current.startX;
      if (Math.abs(deltaX) > 3) {
        dragRef.current.hasMoved = true;
      }
      const barWidth = bounds.plotWidth / Math.max(1, visibleCandles.length);
      const deltaBars = Math.round(deltaX / barWidth);
      setViewport(panViewport(dragRef.current.initialViewport, deltaBars));
      setHover(null);
      return;
    }
    setHover({ mouseX, mouseY, index: localIdx, candle });
  };
  const handleMouseUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
    }
  };
  const handleMouseLeave = () => {
    dragRef.current.isDragging = false;
    setHover(null);
  };
  useEffect2(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setRuler({ active: false, startPoint: null, currentPoint: null });
        setIsRulerToolActive(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const isZoomed = isViewportZoomed(viewport);
  const zoomLevel = getZoomLevel(viewport);
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
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            onDoubleClick: handleReset,
            className: `block w-full h-full ${ruler.active || isRulerToolActive ? "cursor-crosshair" : dragRef.current.isDragging ? "cursor-grabbing" : isZoomed ? "cursor-grab" : "cursor-crosshair"}`
          }
        ),
        showControls && sortedCandles.length > 0 && /* @__PURE__ */ jsx4(
          VortexChartControls,
          {
            onZoomIn: handleZoomIn,
            onZoomOut: handleZoomOut,
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
import { useEffect as useEffect3, useRef as useRef3, useState as useState3, useMemo as useMemo3 } from "react";
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
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
  showWatermark = true,
  theme = {}
}) => {
  const containerRef = useRef3(null);
  const canvasRef = useRef3(null);
  const [containerWidth, setContainerWidth] = useState3(600);
  const [hover, setHover] = useState3(null);
  const [ruler, setRuler] = useState3({
    active: false,
    startPoint: null,
    currentPoint: null
  });
  const mergedColors = useMemo3(() => ({ ...VORTEX_THEME.colors, ...theme.colors || {} }), [theme]);
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
  useEffect3(() => {
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
  useEffect3(() => {
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
    if (ruler.active) {
      drawRulerOverlay(ctx, bounds, ruler);
    }
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
    mergedColors
  ]);
  const handleMouseDown = (e) => {
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
      index: idx
    };
    setRuler({
      active: true,
      startPoint: point,
      currentPoint: point
    });
  };
  const handleMouseMove = (e) => {
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
          index: idx
        }
      }));
      return;
    }
    setHover({ mouseX, mouseY, index: idx, candle });
  };
  const handleMouseUp = () => {
  };
  const handleMouseLeave = () => {
    setHover(null);
  };
  useEffect3(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setRuler({ active: false, startPoint: null, currentPoint: null });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
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
      onClick: () => {
        if (ruler.active && !ruler.startPoint) {
          setRuler({ active: false, startPoint: null, currentPoint: null });
        }
      },
      children: [
        /* @__PURE__ */ jsx5(
          "canvas",
          {
            ref: canvasRef,
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            className: "cursor-crosshair block w-full h-full"
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
export {
  VORTEX_THEME,
  VortexCandleChart,
  VortexChartControls,
  VortexConeChart,
  VortexRangeChart,
  VortexWatermarkOverlay,
  createViewport,
  drawRulerOverlay,
  drawVortexWatermark,
  formatCandleTime,
  formatChange,
  formatPrice,
  formatVolume,
  getVisibleCount,
  getZoomLevel,
  isViewportZoomed,
  panViewport,
  resetViewport,
  viewportIndexToX,
  viewportXToIndex,
  zoomViewport
};
//# sourceMappingURL=index.js.map