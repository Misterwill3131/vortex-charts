export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): { ctx: CanvasRenderingContext2D; dpr: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Only reallocate the backing store when the target size actually changed.
  // Reassigning canvas.width resets the GPU buffer even for identical values,
  // which is costly when done on every render pass.
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, dpr };
}
