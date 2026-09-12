import { useEffect, useRef, useState } from "react";

/**
 * Owns the chart DOM surface: container, main canvas, overlay canvas,
 * container width tracking and devicePixelRatio awareness.
 */
export function useChartSurface() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [dpr, setDpr] = useState<number>(() =>
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );

  // Track container width, coalescing resize bursts through requestAnimationFrame
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || 600);

    let raf = 0;
    let pendingWidth = 0;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && width !== pendingWidth) {
          pendingWidth = width;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => setContainerWidth(pendingWidth));
        }
      }
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // React to devicePixelRatio changes (e.g. window dragged between Retina / standard monitors)
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dpr]);

  return { containerRef, canvasRef, overlayRef, containerWidth, dpr };
}
