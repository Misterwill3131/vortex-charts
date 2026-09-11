export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): { ctx: CanvasRenderingContext2D; dpr: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  return { ctx, dpr };
}
