export const VORTEX_THEME = {
  colors: {
    spot: "#38bdf8", // Neon Cyan
    bullish: "#10b981", // Neon Emerald
    bearish: "#f43f5e", // Neon Crimson / Rose
    neutral: "#eab308", // Golden Yellow
    vwap: "#c084fc", // Lilac / Purple
    grid: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#71717a",
    textBright: "#ffffff",
    cardBg: "#020616",
  },
  typography: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 11,
  },
  layout: {
    borderRadius: 16,
  },
} as const;

/**
 * Consumer-facing theme override. Unlike Partial<typeof VORTEX_THEME>, color
 * values are plain strings so applications can inject their own palette
 * (the const-asserted token object would otherwise narrow to literals).
 */
export interface VortexThemeOverride {
  colors?: {
    spot?: string;
    bullish?: string;
    bearish?: string;
    neutral?: string;
    vwap?: string;
    grid?: string;
    border?: string;
    text?: string;
    textBright?: string;
    cardBg?: string;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: number;
  };
  layout?: {
    borderRadius?: number;
  };
}
