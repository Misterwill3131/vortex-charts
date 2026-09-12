import { describe, it, expect } from "vitest";
import {
  createViewport,
  createTailViewport,
  followViewport,
  isViewportZoomed,
  getZoomLevel,
  getVisibleCount,
  zoomViewport,
  panViewport,
  resetViewport,
} from "./viewport";

describe("Viewport Engine", () => {
  it("initializes a full viewport correctly", () => {
    const vp = createViewport(50, 10);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBe(49);
    expect(vp.totalCount).toBe(50);
    expect(vp.minVisible).toBe(10);
    expect(isViewportZoomed(vp)).toBe(false);
    expect(getZoomLevel(vp)).toBe(1);
    expect(getVisibleCount(vp)).toBe(50);
  });

  it("handles empty or single item series gracefully", () => {
    const emptyVp = createViewport(0);
    expect(emptyVp.startIndex).toBe(0);
    expect(emptyVp.endIndex).toBe(0);
    expect(isViewportZoomed(emptyVp)).toBe(false);

    const singleVp = createViewport(1);
    expect(singleVp.startIndex).toBe(0);
    expect(singleVp.endIndex).toBe(0);
    expect(getVisibleCount(singleVp)).toBe(1);
  });

  it("zooms in around center anchor point", () => {
    const vp = createViewport(100, 10);
    const zoomedIn = zoomViewport(vp, 2.0, 0.5); // 2x zoom
    expect(getVisibleCount(zoomedIn)).toBe(50);
    expect(zoomedIn.startIndex).toBeGreaterThan(0);
    expect(zoomedIn.endIndex).toBeLessThan(99);
    expect(isViewportZoomed(zoomedIn)).toBe(true);
    expect(getZoomLevel(zoomedIn)).toBe(2);
  });

  it("clamps zoom to minVisible", () => {
    const vp = createViewport(100, 10);
    const extremeZoom = zoomViewport(vp, 100, 0.5);
    expect(getVisibleCount(extremeZoom)).toBe(10);
    expect(extremeZoom.startIndex).toBeGreaterThanOrEqual(0);
    expect(extremeZoom.endIndex).toBeLessThanOrEqual(99);
  });

  it("zooms out and clamps to total count", () => {
    const vp = createViewport(100, 10);
    const zoomedIn = zoomViewport(vp, 2.0, 0.5);
    const zoomedOut = zoomViewport(zoomedIn, 0.1, 0.5);
    expect(zoomedOut.startIndex).toBe(0);
    expect(zoomedOut.endIndex).toBe(99);
    expect(isViewportZoomed(zoomedOut)).toBe(false);
  });

  it("pans left and right within bounds", () => {
    const vp = createViewport(100, 10);
    const zoomed = zoomViewport(vp, 2.0, 0.5); // span = 50, start = 25, end = 74
    const pannedLeft = panViewport(zoomed, 10); // pan earlier (shift indices left)
    expect(pannedLeft.startIndex).toBe(zoomed.startIndex - 10);
    expect(pannedLeft.endIndex).toBe(zoomed.endIndex - 10);

    // Pan beyond boundary
    const hitStart = panViewport(zoomed, 100);
    expect(hitStart.startIndex).toBe(0);
    expect(hitStart.endIndex).toBe(49);

    const hitEnd = panViewport(zoomed, -100);
    expect(hitEnd.endIndex).toBe(99);
    expect(hitEnd.startIndex).toBe(50);
  });

  it("resets viewport back to initial state", () => {
    const vp = createViewport(60, 8);
    const zoomed = zoomViewport(vp, 3.0, 0.8);
    expect(isViewportZoomed(zoomed)).toBe(true);

    const reset = resetViewport(60, 8);
    expect(reset.startIndex).toBe(0);
    expect(reset.endIndex).toBe(59);
    expect(isViewportZoomed(reset)).toBe(false);
  });
});

describe("tail viewport (live charts)", () => {
  it("opens on the last N bars when the series is longer", () => {
    const vp = createTailViewport(1000, 450, 6);
    expect(vp.startIndex).toBe(550);
    expect(vp.endIndex).toBe(999);
    expect(getVisibleCount(vp)).toBe(450);
    expect(isViewportZoomed(vp)).toBe(true);
  });

  it("shows everything when the series is shorter than the window", () => {
    const vp = createTailViewport(300, 450, 6);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBe(299);
    expect(isViewportZoomed(vp)).toBe(false);
  });

  it("handles empty series", () => {
    const vp = createTailViewport(0, 450, 6);
    expect(vp.startIndex).toBe(0);
    expect(vp.totalCount).toBe(0);
  });
});

describe("followViewport (live growth)", () => {
  it("keeps the zoom span and slides to the newest bars", () => {
    const zoomed = createViewport(100, 10);
    const span = 30;
    const panned = {
      ...zoomed,
      startIndex: 20,
      endIndex: 20 + span - 1,
      totalCount: 100,
    };
    const next = followViewport(panned, 102);
    expect(next.totalCount).toBe(102);
    expect(getVisibleCount(next)).toBe(span);
    expect(next.endIndex).toBe(101);
    expect(next.startIndex).toBe(102 - span);
  });

  it("returns the same reference when the count is unchanged", () => {
    const vp = createViewport(50, 10);
    expect(followViewport(vp, 50)).toBe(vp);
  });

  it("falls back to an empty viewport when the series empties", () => {
    const next = followViewport(createViewport(50, 10), 0);
    expect(next.totalCount).toBe(0);
    expect(getVisibleCount(next)).toBe(0);
  });
});
