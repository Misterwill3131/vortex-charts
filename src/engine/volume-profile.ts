import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { priceToY } from "./coordinates";

export interface VolumeProfileBin {
  price: number;
  priceTop: number;
  priceBottom: number;
  volume: number;
  isValueArea: boolean;
  isPoc: boolean;
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  totalVolume: number;
  maxBinVolume: number;
}

export interface DrawVolumeProfileOptions {
  alignment?: "left" | "right";
  widthRatio?: number; // max fraction of plot width
  pocColor?: string;
  valueAreaColor?: string;
  otherAreaColor?: string;
  showLines?: boolean;
}

/**
 * Computes Volume Profile histogram distribution, POC, VAH, and VAL from candles.
 */
export function computeVolumeProfile(
  candles: Candle[],
  rows: number = 24,
  valueAreaRatio: number = 0.7
): VolumeProfileResult | null {
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
  const rawBins: { volume: number; price: number; top: number; bottom: number }[] = [];

  for (let r = 0; r < rows; r++) {
    const bottom = minPrice + r * step;
    const top = bottom + step;
    rawBins.push({
      volume: 0,
      price: (bottom + top) / 2,
      bottom,
      top,
    });
  }

  let totalVolume = 0;

  for (const c of candles) {
    const vol = c.volume ?? 1;
    totalVolume += vol;
    // Distribute candle volume across bins it spans
    const cLow = Math.max(minPrice, c.low);
    const cHigh = Math.min(maxPrice, c.high);
    const cSpan = Math.max(0.0001, cHigh - cLow);

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

  // Find POC (Point of Control)
  let maxBinVolume = 0;
  let pocIdx = 0;
  for (let r = 0; r < rows; r++) {
    if (rawBins[r].volume > maxBinVolume) {
      maxBinVolume = rawBins[r].volume;
      pocIdx = r;
    }
  }

  const pocPrice = rawBins[pocIdx].price;

  // Compute Value Area (enclosing valueAreaRatio, default 70% of total volume)
  const targetVaVolume = totalVolume * valueAreaRatio;
  let currentVaVolume = rawBins[pocIdx].volume;
  const inVa = new Set<number>([pocIdx]);
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

  const bins: VolumeProfileBin[] = rawBins.map((b, idx) => ({
    price: b.price,
    priceTop: b.top,
    priceBottom: b.bottom,
    volume: b.volume,
    isValueArea: inVa.has(idx),
    isPoc: idx === pocIdx,
  }));

  return {
    bins,
    pocPrice,
    vahPrice,
    valPrice,
    totalVolume,
    maxBinVolume,
  };
}

/**
 * Pure Canvas 2D renderer for horizontal Volume Profile.
 */
export function drawVolumeProfile(
  ctx: CanvasRenderingContext2D,
  profile: VolumeProfileResult,
  bounds: ChartBounds,
  options: DrawVolumeProfileOptions = {}
): void {
  if (!profile || profile.bins.length === 0 || profile.maxBinVolume <= 0) return;

  const {
    alignment = "right",
    widthRatio = 0.32,
    pocColor = "#eab308",
    valueAreaColor = "rgba(56, 189, 248, 0.45)",
    otherAreaColor = "rgba(100, 116, 139, 0.22)",
    showLines = true,
  } = options;

  const maxProfileWidth = bounds.plotWidth * widthRatio;
  const startX =
    alignment === "right"
      ? bounds.padding.left + bounds.plotWidth
      : bounds.padding.left;

  ctx.save();

  // 1. Draw horizontal bars with rounded tips
  for (const bin of profile.bins) {
    const yTop = Math.round(priceToY(bin.priceTop, bounds));
    const yBottom = Math.round(priceToY(bin.priceBottom, bounds));
    const barHeight = Math.max(1, yBottom - yTop);
    const barWidth = (bin.volume / profile.maxBinVolume) * maxProfileWidth;

    const x = alignment === "right" ? startX - barWidth : startX;

    ctx.fillStyle = bin.isPoc
      ? pocColor
      : bin.isValueArea
      ? valueAreaColor
      : otherAreaColor;

    ctx.fillRect(x, yTop, barWidth, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(x, yTop, barWidth, barHeight);
    }
  }

  // 2. Draw key levels (POC, VAH, VAL)
  if (showLines) {
    // POC Line with neon glow
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

    // POC Badge tag
    ctx.fillStyle = pocColor;
    ctx.fillRect(bounds.padding.left + bounds.plotWidth + 2, yPoc - 7, 54, 14);
    ctx.fillStyle = "#020616";
    ctx.font = "bold 9px Inter, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`POC ${profile.pocPrice.toFixed(1)}`, bounds.padding.left + bounds.plotWidth + 29, yPoc);

    // VAH Line
    const yVah = Math.round(priceToY(profile.vahPrice, bounds));
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(bounds.padding.left, yVah);
    ctx.lineTo(bounds.padding.left + bounds.plotWidth, yVah);
    ctx.stroke();

    // VAL Line
    const yVal = Math.round(priceToY(profile.valPrice, bounds));
    ctx.beginPath();
    ctx.moveTo(bounds.padding.left, yVal);
    ctx.lineTo(bounds.padding.left + bounds.plotWidth, yVal);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  ctx.restore();
}
