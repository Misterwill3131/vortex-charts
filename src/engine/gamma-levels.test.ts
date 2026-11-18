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
});
