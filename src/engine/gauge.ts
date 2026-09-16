export interface GaugeOptions {
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  showTicks?: boolean;
  glow?: boolean;
}

/**
 * Pure Canvas 2D renderer for a high-performance radial gauge meter.
 */
export function drawRadialGauge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  value: number,
  options: GaugeOptions = {}
): void {
  const {
    min = 0,
    max = 100,
    label = "BULLISH",
    sublabel = "",
    showTicks = true,
    glow = true,
  } = options;

  const clampedVal = Math.max(min, Math.min(max, value));
  const range = max - min || 1;
  const ratio = (clampedVal - min) / range;

  // Arc configuration (240 degree sweep from bottom-left to bottom-right)
  const startAngle = (3 * Math.PI) / 4; // 135 deg
  const endAngle = (9 * Math.PI) / 4;   // 405 deg (270 deg span)
  const sweepAngle = endAngle - startAngle;
  const currentAngle = startAngle + sweepAngle * ratio;

  const cx = width / 2;
  const cy = height / 2 + 10;
  const radius = Math.min(width, height) / 2 - 28;
  const arcWidth = 14;

  if (radius < 10) return;

  ctx.save();

  // 1. Outer subtle glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + arcWidth / 2 + 4, startAngle, endAngle);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. Background Track Arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = arcWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // 3. Active Progress Arc
  let activeColor = "#10b981"; // Emerald
  if (ratio < 0.35) {
    activeColor = "#ef4444"; // Rose
  } else if (ratio < 0.60) {
    activeColor = "#f59e0b"; // Amber
  } else if (ratio < 0.80) {
    activeColor = "#10b981"; // Emerald
  } else {
    activeColor = "#00f0ff"; // Cyan
  }

  if (ratio > 0.01) {
    ctx.save();
    if (glow) {
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 14;
    }

    // Gradient progression
    const grad = ctx.createLinearGradient(
      cx - radius,
      cy + radius,
      cx + radius,
      cy - radius
    );
    grad.addColorStop(0, "#ef4444");
    grad.addColorStop(0.45, "#f59e0b");
    grad.addColorStop(0.75, "#10b981");
    grad.addColorStop(1, "#00f0ff");

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, currentAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = arcWidth;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // 4. Pointer Pip with Halo
  const pointerX = cx + radius * Math.cos(currentAngle);
  const pointerY = cy + radius * Math.sin(currentAngle);

  // Outer halo
  ctx.beginPath();
  ctx.arc(pointerX, pointerY, arcWidth / 2 + 3, 0, Math.PI * 2);
  ctx.fillStyle = activeColor;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Inner core
  ctx.beginPath();
  ctx.arc(pointerX, pointerY, arcWidth / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = activeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 5. Min / Max Ticks
  if (showTicks) {
    ctx.font = "bold 9px Inter, monospace";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const minX = cx + (radius + 20) * Math.cos(startAngle);
    const minY = cy + (radius + 20) * Math.sin(startAngle);
    ctx.fillText(`${min}`, minX, minY);

    const maxX = cx + (radius + 20) * Math.cos(endAngle);
    const maxY = cy + (radius + 20) * Math.sin(endAngle);
    ctx.fillText(`${max}`, maxX, maxY);
  }

  // 6. Center Numerical Value
  ctx.font = `900 ${Math.max(22, Math.round(radius * 0.48))}px Inter, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(clampedVal)}`, cx, cy - 8);

  // 7. Status Pill / Label
  if (label) {
    ctx.font = "bold 10px Inter, monospace";
    ctx.fillStyle = activeColor;
    ctx.fillText(label.toUpperCase(), cx, cy + Math.round(radius * 0.28));
  }

  if (sublabel) {
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(sublabel, cx, cy + Math.round(radius * 0.46));
  }

  ctx.restore();
}
