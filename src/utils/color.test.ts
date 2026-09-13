import { describe, it, expect } from "vitest";
import { colorWithAlpha } from "./color";

describe("colorWithAlpha", () => {
  it("converts 6-digit hex to rgba with alpha", () => {
    expect(colorWithAlpha("#38bdf8", 0.5)).toBe("rgba(56, 189, 248, 0.5)");
  });

  it("converts 3-digit hex to rgba with alpha", () => {
    expect(colorWithAlpha("#fff", 0.8)).toBe("rgba(255, 255, 255, 0.8)");
  });

  it("converts rgb() to rgba() with alpha", () => {
    expect(colorWithAlpha("rgb(16, 185, 129)", 0.4)).toBe("rgba(16, 185, 129, 0.4)");
  });

  it("overwrites existing rgba() alpha", () => {
    expect(colorWithAlpha("rgba(244, 63, 94, 0.9)", 0.2)).toBe("rgba(244, 63, 94, 0.2)");
  });

  it("clamps alpha between 0 and 1", () => {
    expect(colorWithAlpha("#000000", -0.5)).toBe("rgba(0, 0, 0, 0)");
    expect(colorWithAlpha("#000000", 1.5)).toBe("rgba(0, 0, 0, 1)");
  });
});
