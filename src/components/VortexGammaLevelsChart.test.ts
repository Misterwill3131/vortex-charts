import { describe, it, expect } from "vitest";
import {
  levelStyle,
  offscreenBadgeText,
  offscreenLevelTag,
  clampLabelX,
  finiteLevels,
  spreadLabelYs,
} from "./VortexGammaLevelsChart";
import type { GammaLevel } from "../types";

describe("levelStyle", () => {
  it("maps each kind to its mockup colour family", () => {
    expect(levelStyle("callWall").color).toBe("#f87171");
    expect(levelStyle("putWall").color).toBe("#34d399");
    expect(levelStyle("maxPain").color).toBe("#fbbf24");
    expect(levelStyle("flip").color).toBe("#60a5fa");
    expect(levelStyle("pin").color).toBe("#2dd4bf");
    expect(levelStyle("gexKing").color).toBe("#a78bfa");
    expect(levelStyle("vwap").color).toBe("#9ca3af");
  });

  it("gives every kind a dash pattern", () => {
    expect(levelStyle("vwap").dash.length).toBeGreaterThan(0);
  });
});

describe("offscreenBadgeText", () => {
  it("prefixes an up arrow for levels above the band", () => {
    expect(offscreenBadgeText(759.73, "top")).toBe("▲ 759.73");
  });

  it("prefixes a down arrow for levels below the band", () => {
    expect(offscreenBadgeText(700, "bottom")).toBe("▼ 700.00");
  });

  it("names the level between the arrow and the price", () => {
    expect(offscreenBadgeText(760, "top", "CALL WALL")).toBe("▲ CALL WALL 760.00");
    expect(offscreenBadgeText(700, "bottom", "PW")).toBe("▼ PW 700.00");
  });
});

describe("offscreenLevelTag", () => {
  it("uses the level's own label when it is short and carries no price", () => {
    expect(offscreenLevelTag({ price: 760, kind: "callWall", label: "CALL WALL" })).toBe("CALL WALL");
    expect(offscreenLevelTag({ price: 700, kind: "putWall", label: "PUT WALL" })).toBe("PUT WALL");
  });

  it("falls back to the kind abbreviation for long or price-bearing labels", () => {
    expect(offscreenLevelTag({ price: 764.71, kind: "flip", label: "FLIP ↑ 764.71" })).toBe("FLIP");
    expect(offscreenLevelTag({ price: 750, kind: "pin", label: "PIN · STRONG · 0DTE" })).toBe("PIN");
    expect(offscreenLevelTag({ price: 750, kind: "maxPain", label: "MP 750" })).toBe("MP");
  });

  it("uses compact abbreviations when space is tight", () => {
    const k = (kind: GammaLevel["kind"], label: string) => offscreenLevelTag({ price: 1, kind, label }, true);
    expect(k("callWall", "CALL WALL")).toBe("CW");
    expect(k("putWall", "PUT WALL")).toBe("PW");
    expect(k("maxPain", "MAX PAIN")).toBe("MP");
    expect(k("flip", "FLIP")).toBe("FLIP");
    expect(k("pin", "PIN")).toBe("PIN");
    expect(k("gexKing", "GEX KING")).toBe("KING");
    expect(k("vwap", "VWAP")).toBe("VWAP");
  });
});

describe("clampLabelX", () => {
  it("keeps a centred label fully inside [min, max]", () => {
    expect(clampLabelX(5, 30, 0, 400)).toBe(15);
    expect(clampLabelX(395, 30, 0, 400)).toBe(385);
    expect(clampLabelX(200, 30, 0, 400)).toBe(200);
  });
});

describe("finiteLevels", () => {
  it("drops levels with NaN or infinite prices", () => {
    const levels: GammaLevel[] = [
      { price: 750, kind: "callWall", label: "CALL WALL" },
      { price: NaN, kind: "putWall", label: "PUT WALL" },
      { price: Infinity, kind: "flip", label: "FLIP" },
    ];
    expect(finiteLevels(levels).map((l) => l.kind)).toEqual(["callWall"]);
  });
});

describe("spreadLabelYs", () => {
  it("keeps already-spaced labels in place, in input order", () => {
    expect(spreadLabelYs([100, 20, 60], 15, 0, 200)).toEqual([100, 20, 60]);
  });

  it("separates colliding labels by at least the gap and stays in bounds", () => {
    const ys = spreadLabelYs([50, 50, 52], 16, 40, 200);
    const sorted = [...ys].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(16 - 1e-9);
    }
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(40);
    expect(Math.max(...ys)).toBeLessThanOrEqual(200);
  });

  it("does not merge labels sharing the same natural y", () => {
    expect(spreadLabelYs([80, 80], 10, 0, 200)).toHaveLength(2);
  });
});
