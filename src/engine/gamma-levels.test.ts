import { describe, it, expect, vi } from "vitest";
import { computeLevelBand, layoutLevelChips, drawGammaSideProfile } from "./gamma-levels";
import { computeBounds } from "./coordinates";
import type { Candle, GammaLevel } from "../types";

const candle = (low: number, high: number): Candle => ({
  t: 1,
  open: low,
  high,
  low,
  close: high,
});

describe("layoutLevelChips", () => {
  it("merges levels at the same price", () => {
    const levels: GammaLevel[] = [
      { price: 750, kind: "callWall", label: "CALL WALL" },
      { price: 750, kind: "flip", label: "FLIP" },
      { price: 750, kind: "gexKing", label: "KING" },
    ];
    const chips = layoutLevelChips(levels, (p) => (800 - p) * 10);
    expect(chips).toHaveLength(1);
    expect(chips[0].kinds).toHaveLength(3);
    expect(chips[0].text).toBe("CALL WALL · FLIP · KING");
  });

  it("pushes near chips apart", () => {
    const levels: GammaLevel[] = [
      { price: 745, kind: "pin", label: "PIN" },
      { price: 744, kind: "flip", label: "FLIP" },
    ];
    const chips = layoutLevelChips(levels, (p) => (800 - p) * 10);
    expect(chips).toHaveLength(2);
    expect(chips[1].y - chips[0].y).toBeGreaterThanOrEqual(18);
    expect(chips[0].price).toBe(745);
    expect(chips[1].price).toBe(744);
  });
});

describe("layoutLevelChips bounds", () => {
  const mk = (n: number): GammaLevel[] =>
    Array.from({ length: n }, (_, i) => ({ price: 750 - i * 0.1, kind: "pin" as const, label: "L" + i }));

  it("keeps many chips inside [minY, maxY] in order, compressing the gap", () => {
    const chips = layoutLevelChips(mk(12), (p) => (800 - p) * 10, 18, { minY: 20, maxY: 160 });
    expect(chips).toHaveLength(12);
    for (const c of chips) {
      expect(c.y).toBeGreaterThanOrEqual(20 - 1e-6);
      expect(c.y).toBeLessThanOrEqual(160 + 1e-6);
    }
    for (let i = 1; i < chips.length; i++) expect(chips[i].y).toBeGreaterThanOrEqual(chips[i - 1].y);
    expect(chips.map((c) => c.text)).toEqual(mk(12).map((l) => l.label));
  });

  it("clamps a chip that starts above the top edge", () => {
    const chips = layoutLevelChips(
      [{ price: 790, kind: "pin", label: "A" }],
      (p) => (800 - p) * 10 - 100,
      18,
      { minY: 10, maxY: 200 }
    );
    expect(chips[0].y).toBe(10);
  });

  it("centres a dense cluster near its prices instead of drifting down", () => {
    const levels: GammaLevel[] = [
      { price: 750, kind: "pin", label: "A" },
      { price: 749.9, kind: "flip", label: "B" },
      { price: 749.8, kind: "maxPain", label: "C" },
    ];
    const toY = (p: number) => (800 - p) * 10; // 500, 501, 502
    const chips = layoutLevelChips(levels, toY, 18);
    expect(chips[1].y).toBeCloseTo(501, 5);
    expect(chips[0].y).toBeLessThan(500);
    expect(chips[2].y - chips[1].y).toBeGreaterThanOrEqual(18 - 1e-6);
    expect(chips[1].y - chips[0].y).toBeGreaterThanOrEqual(18 - 1e-6);
  });
});

describe("computeLevelBand", () => {
  it("sends a far level offscreen", () => {
    const band = computeLevelBand(
      [candle(735, 742)],
      740,
      [{ price: 800, kind: "callWall", label: "CALL WALL" }]
    );
    expect(band.offscreen[0].edge).toBe("top");
    expect(band.max).toBeLessThan(800);
    expect(band.inside).toHaveLength(0);
  });

  it("sends a far low level to the bottom edge", () => {
    const band = computeLevelBand(
      [candle(735, 742)],
      740,
      [{ price: 600, kind: "putWall", label: "PUT WALL" }]
    );
    expect(band.offscreen[0].edge).toBe("bottom");
  });

  it("contains all near levels and spot", () => {
    const levels: GammaLevel[] = [
      { price: 740, kind: "putWall", label: "PUT WALL" },
      { price: 745, kind: "pin", label: "PIN" },
      { price: 750, kind: "callWall", label: "CALL WALL" },
      { price: 754, kind: "maxPain", label: "MAX PAIN" },
    ];
    const spot = 744.97;
    const band = computeLevelBand([candle(743, 746)], spot, levels);
    expect(band.offscreen).toHaveLength(0);
    expect(band.inside).toHaveLength(4);
    for (const p of [spot, ...levels.map((l) => l.price)]) {
      expect(band.min).toBeLessThanOrEqual(p);
      expect(band.max).toBeGreaterThanOrEqual(p);
    }
  });
});

describe("drawGammaSideProfile", () => {
  it("draws without throwing and skips empty input", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const bounds = computeBounds([740, 750], 400, 300);
    const opts = { x: 300, width: 80, posColor: "#0f0", negColor: "#f00" };
    drawGammaSideProfile(ctx, [], bounds, opts);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    drawGammaSideProfile(
      ctx,
      [
        { strike: 742, gex: 5 },
        { strike: 745, gex: -10 },
        { strike: 748, gex: 2 },
      ],
      bounds,
      opts
    );
    expect(ctx.fillRect).toHaveBeenCalledTimes(3);
  });

  it("ignores strikes outside bounds and scales on visible points only", () => {
    const calls: number[][] = [];
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn((...a: number[]) => calls.push(a)),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const bounds = computeBounds([740, 750], 400, 300);
    drawGammaSideProfile(
      ctx,
      [
        { strike: 5000, gex: 1e9 },
        { strike: 745, gex: 10 },
        { strike: 746, gex: -5 },
      ],
      bounds,
      { x: 300, width: 80, posColor: "#0f0", negColor: "#f00" }
    );
    expect(calls).toHaveLength(2);
    // Largest visible bar spans half the panel width (40px).
    expect(Math.max(...calls.map((c) => c[2]))).toBeCloseTo(40, 5);
  });
});
