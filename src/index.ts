// Components
export { VortexCandleChart, type VortexCandleChartProps } from "./components/VortexCandleChart";
export { VortexRangeChart, type VortexRangeChartProps } from "./components/VortexRangeChart";
export { VortexConeChart, type VortexConeChartProps } from "./components/VortexConeChart";
export { VortexChartControls, type VortexChartControlsProps } from "./components/VortexChartControls";

// Engine & Interactive Tools
export {
  createViewport,
  zoomViewport,
  panViewport,
  resetViewport,
  isViewportZoomed,
  getZoomLevel,
  getVisibleCount,
  type ViewportState,
} from "./engine/viewport";
export { drawRulerOverlay, type RulerState, type RulerPoint } from "./engine/ruler";
export { viewportIndexToX, viewportXToIndex } from "./engine/coordinates";
export { formatChange, formatVolume } from "./engine/interaction";

// Branding & Watermark
export { drawVortexWatermark, VortexWatermarkOverlay } from "./engine/watermark";

// Theme
export { VORTEX_THEME } from "./theme/tokens";

// Types
export type {
  Candle,
  PriceLine,
  PriorDayRange,
  PremarketRange,
  VwapPoint,
  ExpectedMoveSpec,
  TargetRange,
} from "./types";

// Utilities
export { formatCandleTime, formatPrice } from "./utils/chart-defaults";
