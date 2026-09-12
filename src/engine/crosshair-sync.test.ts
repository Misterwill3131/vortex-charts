import { describe, it, expect, vi } from "vitest";
import { publishCrosshairSync, subscribeCrosshairSync } from "./crosshair-sync";

describe("crosshair sync bus", () => {
  it("delivers events to every subscriber in the group", () => {
    const a = vi.fn();
    const b = vi.fn();
    const unA = subscribeCrosshairSync("g1", a);
    const unB = subscribeCrosshairSync("g1", b);

    publishCrosshairSync("g1", { time: 1234, sourceId: "chart-a" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith({ time: 1234, sourceId: "chart-a" });

    unA();
    unB();
  });

  it("isolates groups from each other", () => {
    const g1 = vi.fn();
    const g2 = vi.fn();
    const un1 = subscribeCrosshairSync("g1", g1);
    const un2 = subscribeCrosshairSync("g2", g2);

    publishCrosshairSync("g1", { time: 1, sourceId: "x" });
    expect(g1).toHaveBeenCalledTimes(1);
    expect(g2).not.toHaveBeenCalled();

    un1();
    un2();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsub = subscribeCrosshairSync("g3", listener);
    unsub();

    publishCrosshairSync("g3", { time: 1, sourceId: "x" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("accepts null time (cursor left the source chart)", () => {
    const listener = vi.fn();
    const unsub = subscribeCrosshairSync("g4", listener);

    publishCrosshairSync("g4", { time: null, sourceId: "x" });
    expect(listener).toHaveBeenCalledWith({ time: null, sourceId: "x" });

    unsub();
  });

  it("cleans the group up when the last subscriber leaves", () => {
    const unsub = subscribeCrosshairSync("g5", () => {});
    unsub();
    // Publishing to an empty group must be a harmless no-op
    expect(() => publishCrosshairSync("g5", { time: 1, sourceId: "x" })).not.toThrow();
  });
});