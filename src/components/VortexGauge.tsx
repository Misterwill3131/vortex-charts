import React, { useEffect } from "react";
import { type VortexThemeOverride } from "../theme/tokens";
import { setupCanvasDpi } from "../engine/canvas";
import { useChartSurface } from "../hooks/useChartSurface";
import { drawRadialGauge, type GaugeOptions } from "../engine/gauge";

export interface VortexGaugeProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  height?: number;
  className?: string;
  showTicks?: boolean;
  theme?: VortexThemeOverride;
}

export const VortexGauge: React.FC<VortexGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label = "BULLISH",
  sublabel = "",
  height = 180,
  className = "",
  showTicks = true,
  theme = {},
}) => {
  const { containerRef, canvasRef, containerWidth } = useChartSurface();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvasDpi(canvas, containerWidth, height);
    if (!setup) return;
    const { ctx } = setup;

    ctx.clearRect(0, 0, containerWidth, height);

    drawRadialGauge(ctx, containerWidth, height, value, {
      min,
      max,
      label,
      sublabel,
      showTicks,
      glow: true,
    });
  }, [containerWidth, height, value, min, max, label, sublabel, showTicks, theme, canvasRef]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
