export type LineStyleType = "solid" | "dotted" | "dashed";

export function formatCandleTime(timestampMs: number, isIntraday: boolean = false): string {
  const d = new Date(timestampMs);
  if (isIntraday) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toISOString().slice(0, 10);
}

export function formatPrice(price: number): string {
  if (isNaN(price)) return "—";
  return price.toFixed(2);
}
