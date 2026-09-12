// Components
export { VortexCandleChart, type VortexCandleChartProps } from "./components/VortexCandleChart";
export { VortexRangeChart, type VortexRangeChartProps } from "./components/VortexRangeChart";
export { VortexConeChart, type VortexConeChartProps } from "./components/VortexConeChart";
export { VortexBarChart, type VortexBarChartProps } from "./components/VortexBarChart";
export { VortexChartControls, type VortexChartControlsProps } from "./components/VortexChartControls";

// Engine & Interactive Tools
export {
  createViewport,
  createTailViewport,
  followViewport,
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
export {
  timeToX,
  xToTime,
  nearestTimeIndex,
  type TimeScaleMapping,
} from "./engine/coordinates";
export {
  drawChartZones,
  computeZoneRect,
  parseZoneColor,
  type ChartZone,
} from "./engine/zones";
export { measureTextWidth } from "./engine/text-cache";
export {
  computeBarBounds,
  thinLabels,
  nearestDatumIndex,
  drawBarChart,
  drawBarHoverBand,
  type BarDatum,
  type BarReferenceLine,
} from "./engine/bars";
export { formatChange, formatVolume } from "./engine/interaction";

// Branding & Watermark
export { drawVortexWatermark, VortexWatermarkOverlay } from "./engine/watermark";

// Multi-chart Crosshair Synchronization
export {
  subscribeCrosshairSync,
  publishCrosshairSync,
  type CrosshairSyncEvent,
} from "./engine/crosshair-sync";

// React Hooks (shared chart interaction engine)
export { useChartSurface } from "./hooks/useChartSurface";
export { useChartViewport } from "./hooks/useChartViewport";
export { useChartPointer } from "./hooks/useChartPointer";
export { useCrosshairSync } from "./hooks/useCrosshairSync";

// Theme
export { VORTEX_THEME, type VortexThemeOverride } from "./theme/tokens";

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
