import { describe, it, expect } from "vitest";
import { computeBarBounds, thinLabels, nearestDatumIndex, type BarDatum } from "./bars";

const DATA: BarDatum[] = [
  { x: 100, label: "100", value: 5 },
  { x: 110, label: "110", value: -3, value2: 2, overlay: 1.5 },
  { x: 120, label: "120", value: 8, value2: -4, overlay: 2.5 },
];

describe("computeBarBounds", () => {
  it("builds a symmetric domain around zero", () => {
    const b = computeBarBounds(DATA, 600, 300, true);
    expect(b.minPrice).toBeCloseTo(-8 * 1.08, 6);
    expect(b.maxPrice).toBeCloseTo(8 * 1.08, 6);
    expect(b.priceRange).toBeCloseTo(2 * 8 * 1.08, 6);
  });

  it("clamps to include zero when not symmetric", () => {
    const allPositive: BarDatum[] = [
      { x: 1, label: "a", value: 4 },
      { x: 2, label: "b", value: 10 },
    ];
    const b = computeBarBounds(allPositive, 600, 300, false);
    expect(b.minPrice).toBe(0);
    expect(b.maxPrice).toBeCloseTo(10 * 1.08, 6);
  });

  it("survives empty data and all-zero values", () => {
    const empty = computeBarBounds([], 600, 300, true);
    expect(empty.priceRange).toBeGreaterThan(0);

    const zeros = computeBarBounds([{ x: 1, label: "a", value: 0 }], 600, 300, true);
    expect(zeros.minPrice).toBeLessThan(0);
    expect(zeros.maxPrice).toBeGreaterThan(0);
  });

  it("ignores non-finite values when computing the domain", () => {
    const dirty: BarDatum[] = [
      { x: 1, label: "a", value: NaN },
      { x: 2, label: "b", value: Infinity },
      { x: 3, label: "c", value: 6 },
    ];
    const b = computeBarBounds(dirty, 600, 300, true);
    expect(b.maxPrice).toBeCloseTo(6 * 1.08, 6);
  });

  it("accounts for grouped and overlay series in the domain", () => {
    const b = computeBarBounds(DATA, 600, 300, true);
    // |overlay| max is 2.5, |value| max is 8, |value2| max is 4 → domain driven by 8
    expect(b.maxPrice).toBeCloseTo(8 * 1.08, 6);
  });
});

describe("thinLabels", () => {
  it("keeps all labels when they fit", () => {
    const visible = thinLabels(6, 600);
    expect(visible.filter(Boolean).length).toBe(6);
  });

  it("thins to fit the available width, preserving first and last", () => {
    const visible = thinLabels(60, 560);
    const kept = visible.filter(Boolean).length;
    expect(kept).toBeLessThan(60);
    expect(visible[0]).toBe(true);
    expect(visible[59]).toBe(true);
  });

  it("handles zero and single items", () => {
    expect(thinLabels(0, 600).length).toBe(0);
    expect(thinLabels(1, 600)).toEqual([true]);
  });
});

describe("nearestDatumIndex", () => {
  it("finds the closest datum by numeric x", () => {
    expect(nearestDatumIndex(DATA, 109)).toBe(1);
    expect(nearestDatumIndex(DATA, 121)).toBe(2);
    expect(nearestDatumIndex(DATA, 99)).toBe(0);
  });

  it("returns -1 on empty data", () => {
    expect(nearestDatumIndex([], 100)).toBe(-1);
  });
});