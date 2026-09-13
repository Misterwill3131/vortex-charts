import React, { useEffect, useMemo, useState } from "react";
import type { Candle } from "../types";
import { type VortexThemeOverride } from "../theme/tokens";
import { computeBounds, type ChartBounds } from "../engine/coordinates";
import { drawGridAndAxes } from "../engine/grid";
import { drawVortexWatermark } from "../engine/watermark";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { computeVolumeProfile, drawVolumeProfile, type VolumeProfileResult } from "../engine/volume-profile";
import { drawCandlesticks } from "../engine/candles";
import { formatPrice } from "../utils/chart-defaults";

export interface VortexVolumeProfileChartProps {
  data: Candle[];
  rows?: number;
  valueAreaRatio?: number;
  alignment?: "left" | "right";
  showCandles?: boolean;
  upColor?: string;
  downColor?: string;
  pocColor?: string;
  valueAreaColor?: string;
  otherAreaColor?: string;
  height?: number;
  className?: string;
  showWatermark?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexVolumeProfileChart: React.FC<VortexVolumeProfileChartProps> = ({
  data,
  rows = 28,
  valueAreaRatio = 0.7,
  alignment = "right",
  showCandles = true,
  upColor = "#10b981",
  downColor = "#f43f5e",
  pocColor = "#eab308",
  valueAreaColor = "rgba(56, 189, 248, 0.4)",
  otherAreaColor = "rgba(100, 116, 139, 0.2)",
  height = 360,
  className = "",
  showWatermark = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, overlayRef, containerWidth } = useChartSurface();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const profile: VolumeProfileResult | null = useMemo(() => {
    return computeVolumeProfile(data, rows, valueAreaRatio);
  }, [data, rows, valueAreaRatio]);

  const bounds: ChartBounds = useMemo(() => {
    const allPrices: number[] = [];
    data.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });
    return computeBounds(allPrices, containerWidth, height);
  }, [data, containerWidth, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawGridAndAxes(ctx, bounds);

    if (showCandles && data.length > 0) {
      drawCandlesticks(ctx, data, bounds, {
        upColor: theme.colors?.bullish ?? upColor,
        downColor: theme.colors?.bearish ?? downColor,
      });
    }

    if (profile) {
      drawVolumeProfile(ctx, profile, bounds, {
        alignment,
        pocColor,
        valueAreaColor,
        otherAreaColor,
        showLines: true,
      });
    }

    if (showWatermark) {
      drawVortexWatermark(ctx, bounds);
    }
  }, [containerWidth, height, bounds, data, profile, alignment, showCandles, upColor, downColor, pocColor, valueAreaColor, otherAreaColor, showWatermark, theme, canvasRef]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const step = bounds.plotWidth / Math.max(1, data.length);
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((mouseX - bounds.padding.left) / step)));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none group ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />

      {profile && (
        <div className="pointer-events-none absolute top-2.5 left-3 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xl font-mono text-zinc-300">
          <span>POC: <strong className="text-amber-400">${formatPrice(profile.pocPrice)}</strong></span>
          <span>VAH: <strong className="text-sky-400">${formatPrice(profile.vahPrice)}</strong></span>
          <span>VAL: <strong className="text-sky-400">${formatPrice(profile.valPrice)}</strong></span>
          {hovered && (
            <span>Close: <strong className="text-white">${formatPrice(hovered.close)}</strong></span>
          )}
        </div>
      )}
    </div>
  );
};
