import { describe, it, expect } from "vitest";
import { computeZoneRect, parseZoneColor, type ChartZone } from "./zones";
import { computeBounds } from "./coordinates";

const BOUNDS = computeBounds([100, 200], 600, 300);
const VISIBLE = [
  { t: 1_000 },
  { t: 2_000 },
  { t: 3_000 },
  { t: 4_000 },
];

describe("parseZoneColor", () => {
  it("parses hex colors", () => {
    expect(parseZoneColor("#f85149")).toEqual({ r: 248, g: 81, b: 73 });
  });

  it("parses rgb triplets", () => {
    expect(parseZoneColor("63, 222, 132")).toEqual({ r: 63, g: 222, b: 132 });
  });

  it("falls back to the brand cyan on garbage input", () => {
    expect(parseZoneColor("not-a-color")).toEqual({ r: 56, g: 189, b: 248 });
  });
});

describe("computeZoneRect", () => {
  const zone = (over: Partial<ChartZone>): ChartZone => ({
    anchorTime: 2_000,
    top: 190,
    bottom: 110,
    color: "#f85149",
    ...over,
  });

  it("maps the anchor to the correct slot", () => {
    const rect = computeZoneRect(zone({}), VISIBLE, BOUNDS);
    expect(rect).not.toBeNull();
    // anchorTime 2000 matches index 1 of 4 → left edge of slot 1
    const slot = BOUNDS.plotWidth / VISIBLE.length;
    expect(rect!.x1).toBeCloseTo(BOUNDS.padding.left + slot, 4);
    expect(rect!.x2).toBe(BOUNDS.chartWidth - BOUNDS.padding.right);
  });

  it("clamps anchors left of the visible window to the plot edge", () => {
    const rect = computeZoneRect(zone({ anchorTime: 0 }), VISIBLE, BOUNDS);
    expect(rect).not.toBeNull();
    expect(rect!.x1).toBe(BOUNDS.padding.left);
  });

  it("returns null for anchors beyond the visible window", () => {
    expect(computeZoneRect(zone({ anchorTime: 9_000 }), VISIBLE, BOUNDS)).toBeNull();
  });

  it("returns null for degenerate (flat) zones", () => {
    expect(computeZoneRect(zone({ top: 150, bottom: 150 }), VISIBLE, BOUNDS)).toBeNull();
  });

  it("returns null on an empty visible window", () => {
    expect(computeZoneRect(zone({}), [], BOUNDS)).toBeNull();
  });

  it("maps price bounds to screen orientation (top above bottom)", () => {
    const rect = computeZoneRect(zone({}), VISIBLE, BOUNDS);
    expect(rect!.yTop).toBeLessThan(rect!.yBottom);
  });
});