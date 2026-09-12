import { describe, it, expect } from "vitest";
import { formatPrice, formatCandleTime } from "./chart-defaults";

describe("formatPrice", () => {
  it("formats standard equity prices with 2 decimals", () => {
    expect(formatPrice(583.456)).toBe("583.46");
    expect(formatPrice(0.5)).toBe("0.50");
  });

  it("formats large prices with thousands separators", () => {
    expect(formatPrice(62150.123)).toBe("62,150.12");
    expect(formatPrice(10000)).toBe("10,000.00");
  });

  it("formats sub-cent assets with significant digits", () => {
    expect(formatPrice(0.0001234)).toBe("0.0001234");
    expect(formatPrice(0.0)).toBe("0.00");
  });

  it("returns an em-dash for invalid numbers", () => {
    expect(formatPrice(NaN)).toBe("—");
    expect(formatPrice(Infinity)).toBe("—");
    expect(formatPrice(-Infinity)).toBe("—");
  });

  it("formats negative prices correctly", () => {
    expect(formatPrice(-583.456)).toBe("-583.46");
    expect(formatPrice(-0.001234)).toBe("-0.001234");
  });
});

describe("formatCandleTime", () => {
  it("formats intraday candles as local HH:mm", () => {
    const d = new Date(2026, 8, 11, 14, 30);
    const text = formatCandleTime(d.getTime(), true);
    expect(text).toBe("14:30");
  });

  it("formats daily candles as local calendar dates (no UTC shift)", () => {
    // 23:00 local on Sep 11 — toISOString would shift this to Sep 12 in UTC
    const d = new Date(2026, 8, 11, 23, 0);
    const text = formatCandleTime(d.getTime(), false);
    expect(text).toBe("09/11/2026");
  });
});