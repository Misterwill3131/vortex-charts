// Components � 19 Native Vortex Chart Models Suite
export { VortexCandleChart, type VortexCandleChartProps } from "./components/VortexCandleChart";
export { VortexRangeChart, type VortexRangeChartProps } from "./components/VortexRangeChart";
export { VortexConeChart, type VortexConeChartProps } from "./components/VortexConeChart";
export { VortexBarChart, type VortexBarChartProps } from "./components/VortexBarChart";
export { VortexLineChart, type VortexLineChartProps } from "./components/VortexLineChart";
export { VortexOhlcChart, type VortexOhlcChartProps } from "./components/VortexOhlcChart";
export { VortexHeikinAshiChart, type VortexHeikinAshiChartProps } from "./components/VortexHeikinAshiChart";
export { VortexRenkoChart, type VortexRenkoChartProps } from "./components/VortexRenkoChart";
export { VortexPointFigureChart, type VortexPointFigureChartProps } from "./components/VortexPointFigureChart";
export { VortexFootprintChart, type VortexFootprintChartProps } from "./components/VortexFootprintChart";
export { VortexVolumeProfileChart, type VortexVolumeProfileChartProps } from "./components/VortexVolumeProfileChart";
export { VortexRangeBarChart, type VortexRangeBarChartProps } from "./components/VortexRangeBarChart";
export { VortexMultiLineChart, type VortexMultiLineChartProps, type MultiLineSeries } from "./components/VortexMultiLineChart";
export { VortexScatterPlot, type VortexScatterPlotProps } from "./components/VortexScatterPlot";
export { VortexHeatmap, type VortexHeatmapProps } from "./components/VortexHeatmap";
export { VortexAreaChart, type VortexAreaChartProps } from "./components/VortexAreaChart";
export { VortexBoxPlot, type VortexBoxPlotProps, type BoxPlotInputItem } from "./components/VortexBoxPlot";
export { VortexWaterfallChart, type VortexWaterfallChartProps } from "./components/VortexWaterfallChart";
export { VortexRadarChart, type VortexRadarChartProps } from "./components/VortexRadarChart";
export { VortexPieChart, type VortexPieChartProps } from "./components/VortexPieChart";
export { VortexChoroplethMap, type VortexChoroplethMapProps } from "./components/VortexChoroplethMap";
export { VortexWhaleBiasChart, type VortexWhaleBiasChartProps } from "./components/VortexWhaleBiasChart";
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
  type VerticalScaleOptions,
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
export { formatChange, formatVolume, drawCrosshair, drawGenericCrosshair, type GenericCrosshairOptions } from "./engine/interaction";

// New Pure Canvas 2D Renderers & Quantitative Algorithms
export { drawLineChart, type LineSeriesPoint, type DrawLineOptions } from "./engine/line-chart";
export { drawOhlcBars, type DrawOhlcOptions } from "./engine/ohlc-bars";
export { computeHeikinAshi } from "./engine/heikin-ashi";
export { computeRenkoBricks, drawRenkoBricks, type RenkoBrick, type DrawRenkoOptions } from "./engine/renko";
export { computePointAndFigure, drawPointAndFigure, type PnFColumn, type PnFType, type DrawPnFOptions } from "./engine/point-figure";
export { drawFootprintChart, type FootprintBar, type FootprintLevel, type DrawFootprintOptions } from "./engine/footprint";
export { computeVolumeProfile, drawVolumeProfile, type VolumeProfileResult, type VolumeProfileBin, type DrawVolumeProfileOptions } from "./engine/volume-profile";
export { computeRangeBars, type TickData } from "./engine/range-bars";
export { computeScatterBounds, drawScatterPlot, type ScatterPoint, type ScatterBounds, type DrawScatterOptions } from "./engine/scatter";
export { drawHeatmap, type HeatmapData, type DrawHeatmapOptions } from "./engine/heatmap";
export { drawAreaChart, type AreaDataPoint, type DrawAreaOptions } from "./engine/area";
export { computeBoxPlotStats, drawBoxPlot, type BoxPlotItem, type DrawBoxPlotOptions } from "./engine/box-plot";
export { drawWaterfallChart, type WaterfallBar, type DrawWaterfallOptions } from "./engine/waterfall";
export { drawRadarChart, type RadarDimension, type RadarSeries, type DrawRadarOptions } from "./engine/radar";
export { drawPieChart, type PieSlice, type DrawPieOptions } from "./engine/pie";
export { drawChoropleth, type GeoRegion, type GeoPolygon, type DrawChoroplethOptions } from "./engine/choropleth";
export { drawWhaleBiasChart, computeBiasBounds, getBiasPointCoords, type WhaleBiasPoint, type DrawBiasOptions } from "./engine/bias";

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
export { useChartPointer, type ChartHoverZone } from "./hooks/useChartPointer";
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
export { colorWithAlpha } from "./utils/color";
