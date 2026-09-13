import type { ChartBounds } from "./coordinates";

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

export interface DrawPieOptions {
  donutHole?: number; // 0 for pie, 0.55 for donut
  hoverIndex?: number | null;
  borderColor?: string;
  showLabels?: boolean;
}

/**
 * Pure Canvas 2D renderer for Pie and Donut charts.
 */
export function drawPieChart(
  ctx: CanvasRenderingContext2D,
  slices: PieSlice[],
  bounds: ChartBounds,
  options: DrawPieOptions = {}
): void {
  if (!slices || slices.length === 0) return;

  const {
    donutHole = 0.55,
    hoverIndex = null,
    borderColor = "#020616",
    showLabels = true,
  } = options;

  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  if (total <= 0) return;

  const centerX = bounds.chartWidth / 2;
  const centerY = bounds.chartHeight / 2;
  const outerRadius = Math.min(bounds.plotWidth, bounds.plotHeight) / 2 - 20;
  const innerRadius = outerRadius * donutHole;

  if (outerRadius <= 10) return;

  const defaultPalette = [
    "#38bdf8", // Cyan
    "#10b981", // Emerald
    "#f43f5e", // Rose
    "#c084fc", // Purple
    "#eab308", // Yellow
    "#f97316", // Orange
    "#06b6d4", // Sky
  ];

  ctx.save();

  let startAngle = -Math.PI / 2;

  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const val = Math.max(0, s.value);
    const sliceAngle = (val / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const isHovered = hoverIndex === i;

    // Slight radial offset if hovered
    const midAngle = startAngle + sliceAngle / 2;
    const offset = isHovered ? 8 : 0;
    const cx = centerX + Math.cos(midAngle) * offset;
    const cy = centerY + Math.sin(midAngle) * offset;

    const color = s.color ?? defaultPalette[i % defaultPalette.length];

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    } else {
      ctx.lineTo(cx, cy);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text labels if angle is large enough (> 12 degrees)
    if (showLabels && sliceAngle > 0.2) {
      const labelRadius = (innerRadius + outerRadius) / 2;
      const lx = cx + Math.cos(midAngle) * labelRadius;
      const ly = cy + Math.sin(midAngle) * labelRadius;
      const percent = Math.round((val / total) * 100);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${percent}%`, lx, ly);
    }

    startAngle = endAngle;
  }

  ctx.restore();
}
