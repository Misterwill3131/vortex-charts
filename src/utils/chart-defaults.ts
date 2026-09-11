import { LineStyle } from "lightweight-charts";

export function toLineStyle(style?: "solid" | "dotted" | "dashed"): LineStyle {
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

export function formatCandleTime(timestampMs: number, isIntraday: boolean = false): string | number {
  if (isIntraday) {
    return Math.floor(timestampMs / 1000);
  }
  return new Date(timestampMs).toISOString().slice(0, 10);
}
