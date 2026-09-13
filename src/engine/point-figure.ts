import type { Candle } from "../types";
import type { ChartBounds } from "./coordinates";
import { indexToX, priceToY } from "./coordinates";

export type PnFType = "X" | "O";

export interface PnFColumn {
  type: PnFType;
  boxes: number[]; // Price levels
  t: number;
}

export interface DrawPnFOptions {
  xColor?: string;
  oColor?: string;
  gridColor?: string;
}

/**
 * Computes Point and Figure columns from a candle price series.
 * Standard method: High/Low or Close with boxSize and reversal count (default 3).
 */
export function computePointAndFigure(
  candles: Candle[],
  boxSize: number = 1.0,
  reversal: number = 3
): PnFColumn[] {
  if (!candles || candles.length === 0 || boxSize <= 0) return [];

  const columns: PnFColumn[] = [];
  const startPrice = Math.floor(candles[0].close / boxSize) * boxSize;
  let currentType: PnFType = "X";
  let currentBoxes: number[] = [startPrice];
  let lastTime = candles[0].t;

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const time = candles[i].t;

    if (currentType === "X") {
      const topBox = currentBoxes[currentBoxes.length - 1];
      const nextBox = topBox + boxSize;

      if (high >= nextBox) {
        // Continue up
        let p = nextBox;
        while (high >= p) {
          currentBoxes.push(p);
          p += boxSize;
        }
      } else if (low <= topBox - reversal * boxSize) {
        // Reversal to O
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
      // currentType === 'O'
      const bottomBox = currentBoxes[currentBoxes.length - 1];
      const nextBox = bottomBox - boxSize;

      if (low <= nextBox) {
        // Continue down
        let p = nextBox;
        while (low <= p) {
          currentBoxes.push(p);
          p -= boxSize;
        }
      } else if (high >= bottomBox + reversal * boxSize) {
        // Reversal to X
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

/**
 * Pure Canvas 2D renderer for Point & Figure charts.
 */
export function drawPointAndFigure(
  ctx: CanvasRenderingContext2D,
  columns: PnFColumn[],
  bounds: ChartBounds,
  boxSize: number,
  options: DrawPnFOptions = {}
): void {
  if (!columns || columns.length === 0) return;

  const {
    xColor = "#10b981",
    oColor = "#f43f5e",
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
