import * as React from 'react';
import React__default from 'react';

type Candle = {
    t: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
};
type PriceLine = {
    price: number;
    color: string;
    title: string;
    lineWidth?: 1 | 2 | 3 | 4;
    lineStyle?: "solid" | "dotted" | "dashed";
    axisLabelVisible?: boolean;
};
type PriorDayRange = {
    high: number;
    low: number;
    mid: number;
};
type PremarketRange = {
    high: number;
    low: number;
    mid: number;
};
type VwapPoint = {
    t: number;
    vwap: number;
};
type ExpectedMoveSpec = {
    movePct: number;
    moveAbs: number;
    strike?: number;
    expiration: string;
    dte?: number;
};
type TargetRange = {
    high: number;
    low: number;
};

declare const VORTEX_THEME: {
    readonly colors: {
        readonly spot: "#38bdf8";
        readonly bullish: "#10b981";
        readonly bearish: "#f43f5e";
        readonly neutral: "#eab308";
        readonly vwap: "#c084fc";
        readonly grid: "rgba(255, 255, 255, 0.04)";
        readonly border: "rgba(255, 255, 255, 0.08)";
        readonly text: "#71717a";
        readonly textBright: "#ffffff";
        readonly cardBg: "#020616";
    };
    readonly typography: {
        readonly fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        readonly fontSize: 11;
    };
    readonly layout: {
        readonly borderRadius: 16;
    };
};
/**
 * Consumer-facing theme override. Unlike Partial<typeof VORTEX_THEME>, color
 * values are plain strings so applications can inject their own palette
 * (the const-asserted token object would otherwise narrow to literals).
 */
interface VortexThemeOverride {
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

interface ViewportPadding {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
interface ChartBounds {
    minPrice: number;
    maxPrice: number;
    priceRange: number;
    chartWidth: number;
    chartHeight: number;
    plotWidth: number;
    plotHeight: number;
    padding: ViewportPadding;
}
interface VerticalScaleOptions {
    factor?: number;
    offset?: number;
    allowZeroOrNegative?: boolean;
}
interface ViewportLike {
    startIndex: number;
    endIndex: number;
    totalCount: number;
}
interface TimeScaleMapping {
    /** Timestamp of the first visible candle */
    tMin: number;
    /** Timestamp of the last visible candle */
    tMax: number;
}
declare function timeToX(t: number, scale: TimeScaleMapping, bounds: ChartBounds): number;
declare function xToTime(x: number, scale: TimeScaleMapping, bounds: ChartBounds): number;
/**
 * Binary search over chronologically sorted items: returns the index whose
 * timestamp is nearest to `target`. Returns -1 for an empty array.
 */
declare function nearestTimeIndex(items: {
    t: number;
}[], target: number): number;
/**
 * Maps a global data index to an X coordinate using the active viewport window.
 */
declare function viewportIndexToX(globalIndex: number, viewport: ViewportLike, bounds: ChartBounds): number;
/**
 * Maps an X coordinate on the chart to a global data index using the active viewport window.
 */
declare function viewportXToIndex(x: number, viewport: ViewportLike, bounds: ChartBounds): number;

/**
 * Time-anchored zone drawn behind the candles (FVG / Fair Value Gaps,
 * imbalances, open ranges). The zone starts at the candle nearest to
 * `anchorTime` and extends to the right edge of the plot.
 */
interface ChartZone {
    /** Timestamp (ms) of the candle where the zone opens */
    anchorTime: number;
    /** Upper price bound */
    top: number;
    /** Lower price bound */
    bottom: number;
    /** Consequent Encroachment — 50% level, drawn dotted */
    ce?: number;
    /** Optional stacked label (e.g. "UP GAP $180–$185") */
    label?: string;
    /** Zone color as "#rrggbb" hex or "r,g,b" triplet */
    color: string;
}
interface ZoneRect {
    x1: number;
    x2: number;
    yTop: number;
    yBottom: number;
}
/**
 * Resolves a zone's pixel rectangle against the visible candle window.
 * Returns null when the zone is fully out of the visible time range or
 * degenerate. Anchors left of the visible window clamp to the plot's
 * left edge so the zone stays visible while panning history.
 */
declare function computeZoneRect(zone: ChartZone, visible: {
    t: number;
}[], bounds: ChartBounds): ZoneRect | null;
/**
 * Parses "#rrggbb" or "r,g,b" into an rgb triplet for alpha compositing.
 */
declare function parseZoneColor(color: string): {
    r: number;
    g: number;
    b: number;
};
/**
 * Draws zones behind candles: translucent fill, dashed top/bottom borders,
 * dotted CE level, and vertically de-stacked labels.
 */
declare function drawChartZones(ctx: CanvasRenderingContext2D, bounds: ChartBounds, zones: ChartZone[], visible: {
    t: number;
}[]): void;

interface VortexCandleChartProps {
    candles: Candle[];
    priceLines?: PriceLine[];
    swingHigh?: number;
    swingLow?: number;
    spotPrice?: number;
    atrBounds?: {
        upper?: number;
        lower?: number;
    };
    height?: number;
    className?: string;
    timeVisible?: boolean;
    isIntraday?: boolean;
    showWatermark?: boolean;
    showControls?: boolean;
    /**
     * Map X by real timestamps instead of bar index: weekends / market pauses
     * render as proportional empty space (recommended for daily+ timeframes).
     */
    timeScale?: boolean;
    /** Share this id across charts to synchronize their crosshairs */
    crosshairSyncGroup?: string;
    /**
     * Time-anchored zones drawn behind the candles (FVG gaps, imbalances,
     * opening ranges). Each zone starts at its anchor candle and extends to
     * the right edge of the plot.
     */
    zones?: ChartZone[];
    /**
     * "reset" (default): full view when the series length changes.
     * "follow": keep the zoom span, slide to the newest bars (live charts).
     */
    viewportMode?: "reset" | "follow";
    /** Open the chart on the last N bars instead of the full series */
    initialVisibleBars?: number;
    /** Pin time labels to a market timezone, e.g. "America/New_York" */
    timeZone?: string;
    /** Allow direct manipulation dragging past dataset boundaries */
    allowOverscroll?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexCandleChart: React__default.FC<VortexCandleChartProps>;

interface VortexRangeChartProps {
    candles: Candle[];
    priorDay?: PriorDayRange | null;
    premarket?: PremarketRange | null;
    vwapSeries?: VwapPoint[];
    overlayMode?: "all" | "boxes" | "vwap" | "none";
    height?: number;
    className?: string;
    showWatermark?: boolean;
    showControls?: boolean;
    /** Share this id across charts to synchronize their crosshairs */
    crosshairSyncGroup?: string;
    viewportMode?: "reset" | "follow";
    initialVisibleBars?: number;
    allowOverscroll?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexRangeChart: React__default.FC<VortexRangeChartProps>;

interface VortexConeChartProps {
    candles?: Candle[];
    historicalCandles?: Candle[];
    currentPrice?: number;
    spotPrice?: number;
    expirationDate?: string;
    expectedMove?: ExpectedMoveSpec;
    targetRange?: TargetRange;
    dte?: number;
    rangeHigh?: number;
    rangeLow?: number;
    height?: number;
    className?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexConeChart: React__default.FC<VortexConeChartProps>;

interface BarDatum {
    /** Numeric X used to anchor vertical reference lines (e.g. strike) */
    x: number;
    /** Bottom axis label — set to "" to hide an individual label */
    label: string;
    /** Primary bar value */
    value: number;
    /** Optional grouped second bar (rendered side by side) */
    value2?: number;
    /** Optional line-overlay value (e.g. net curve) */
    overlay?: number;
}
interface BarReferenceLine {
    /** Numeric X matched against the nearest datum.x */
    value: number;
    label: string;
    color: string;
}
interface BarChartOptions {
    posColor: string;
    negColor: string;
    posGlow: string;
    negGlow: string;
    /** Fixed color for the primary bars (overrides sign-based coloring) */
    valueColor?: string;
    /** Fixed color for the grouped second bars */
    value2Color?: string;
    overlayColor: string;
    formatValue: (n: number) => string;
    tickCount: number;
    referenceLines: BarReferenceLine[];
}
/**
 * Builds chart bounds for a bar chart. Unlike computeBounds, this supports
 * negative values: the domain is either symmetric around zero (default) or
 * clamped to include zero on the min/max side.
 */
declare function computeBarBounds(data: BarDatum[], width: number, height: number, symmetric: boolean, padding?: ViewportPadding): ChartBounds;
/**
 * Thins bottom labels so they never overlap: keeps at most
 * floor(plotWidth / minGapPx) evenly spaced labels (first + last preserved).
 */
declare function thinLabels(count: number, plotWidth: number, minGapPx?: number): boolean[];
/**
 * Maps a reference-line value to the nearest datum index (binary-free scan:
 * reference lines are few, data can be large but x is sorted in practice).
 */
declare function nearestDatumIndex(data: BarDatum[], value: number): number;
declare function drawBarChart(ctx: CanvasRenderingContext2D, bounds: ChartBounds, data: BarDatum[], options: BarChartOptions): void;
/**
 * Hover highlight band drawn on the overlay canvas (one slot wide).
 */
declare function drawBarHoverBand(ctx: CanvasRenderingContext2D, bounds: ChartBounds, index: number, count: number): void;

interface VortexBarChartProps {
    /** Bar data — one entry per slot (strike, expiration, …) */
    data: BarDatum[];
    /** Vertical reference lines anchored to the nearest datum.x */
    referenceLines?: BarReferenceLine[];
    height?: number;
    className?: string;
    /** Sign-based colors for the primary series (single-series mode) */
    posColor?: string;
    negColor?: string;
    posGlow?: string;
    negGlow?: string;
    /** Fixed primary bar color — overrides sign-based coloring */
    valueColor?: string;
    /** Fixed grouped second-bar color */
    value2Color?: string;
    overlayColor?: string;
    /** Right-axis value formatter (gridline labels) */
    formatValue?: (n: number) => string;
    tickCount?: number;
    /** Symmetric Y domain around zero (GEX-style); false clamps to include 0 */
    symmetric?: boolean;
    /** Custom HTML tooltip content; defaults to a glassmorphism value card */
    tooltipContent?: (datum: BarDatum, index: number) => React__default.ReactNode;
    showWatermark?: boolean;
}
declare const VortexBarChart: React__default.FC<VortexBarChartProps>;

interface LineSeriesPoint {
    x?: number;
    y?: number;
    price: number;
    t?: number;
    label?: string;
}
interface DrawLineOptions {
    color?: string;
    lineWidth?: number;
    strokeDash?: number[];
    showArea?: boolean;
    areaTopOpacity?: number;
    showPoints?: boolean;
    pointRadius?: number;
    glow?: boolean;
    smooth?: boolean;
}
/**
 * Pure Canvas 2D renderer for a continuous financial/quantitative line series.
 */
declare function drawLineChart(ctx: CanvasRenderingContext2D, data: LineSeriesPoint[], bounds: ChartBounds, options?: DrawLineOptions): void;

interface VortexLineChartProps {
    data: LineSeriesPoint[];
    height?: number;
    className?: string;
    color?: string;
    showArea?: boolean;
    showPoints?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexLineChart: React__default.FC<VortexLineChartProps>;

interface VortexOhlcChartProps {
    data: Candle[];
    height?: number;
    className?: string;
    upColor?: string;
    downColor?: string;
    lineWidth?: number;
    tickWidth?: number;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexOhlcChart: React__default.FC<VortexOhlcChartProps>;

interface VortexHeikinAshiChartProps {
    data: Candle[];
    height?: number;
    className?: string;
    upColor?: string;
    downColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexHeikinAshiChart: React__default.FC<VortexHeikinAshiChartProps>;

interface VortexRenkoChartProps {
    data: Candle[];
    brickSize?: number;
    height?: number;
    className?: string;
    upColor?: string;
    downColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexRenkoChart: React__default.FC<VortexRenkoChartProps>;

interface VortexPointFigureChartProps {
    data: Candle[];
    boxSize?: number;
    reversal?: number;
    height?: number;
    className?: string;
    xColor?: string;
    oColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexPointFigureChart: React__default.FC<VortexPointFigureChartProps>;

interface FootprintLevel {
    price: number;
    bidVolume: number;
    askVolume: number;
    delta?: number;
}
interface FootprintBar {
    t: number;
    open: number;
    high: number;
    low: number;
    close: number;
    totalVolume: number;
    levels: FootprintLevel[];
}
interface DrawFootprintOptions {
    upColor?: string;
    downColor?: string;
    bidColor?: string;
    askColor?: string;
    showText?: boolean;
}
/**
 * Pure Canvas 2D renderer for Footprint (Order Flow) cluster charts.
 * Displays Bid x Ask volume executions across price rungs.
 */
declare function drawFootprintChart(ctx: CanvasRenderingContext2D, bars: FootprintBar[], bounds: ChartBounds, options?: DrawFootprintOptions): void;

interface VortexFootprintChartProps {
    data: FootprintBar[];
    height?: number;
    className?: string;
    upColor?: string;
    downColor?: string;
    bidColor?: string;
    askColor?: string;
    showText?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexFootprintChart: React__default.FC<VortexFootprintChartProps>;

interface VortexVolumeProfileChartProps {
    data: Candle[];
    rows?: number;
    valueAreaRatio?: number;
    alignment?: "left" | "right";
    showCandles?: boolean;
    upColor?: string;
    downColor?: string;
    pocColor?: string;
    valueAreaColor?: string;
    otherAreaColor?: string;
    height?: number;
    className?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexVolumeProfileChart: React__default.FC<VortexVolumeProfileChartProps>;

interface TickData {
    price: number;
    volume?: number;
    t?: number;
}
/**
 * Computes constant-range bars from price ticks or high/low points.
 * A new candle is sealed when (high - low) reaches rangeSize.
 */
declare function computeRangeBars(ticks: (TickData | Candle)[], rangeSize?: number): Candle[];

interface VortexRangeBarChartProps {
    data: (TickData | Candle)[];
    rangeSize?: number;
    height?: number;
    className?: string;
    upColor?: string;
    downColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexRangeBarChart: React__default.FC<VortexRangeBarChartProps>;

interface MultiLineSeries {
    name: string;
    color?: string;
    data: (LineSeriesPoint | number)[];
    yAxis?: "left" | "right";
    strokeDash?: number[];
    strokeWidth?: number;
}
interface VortexMultiLineChartProps {
    series: MultiLineSeries[];
    height?: number;
    className?: string;
    showPoints?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
    leftPriceFormatter?: (p: number) => string;
    rightPriceFormatter?: (p: number) => string;
    xAxisFormatter?: (index: number) => string;
}
declare const VortexMultiLineChart: React__default.FC<VortexMultiLineChartProps>;

interface ScatterPoint {
    x: number;
    y: number;
    size?: number;
    color?: string;
    label?: string;
}
interface DrawScatterOptions {
    pointColor?: string;
    defaultRadius?: number;
    showTrendLine?: boolean;
    trendLineColor?: string;
    glow?: boolean;
    hoveredIndex?: number | null;
}
interface ScatterBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}
/**
 * Computes min/max bounds for Cartesian X/Y scatter data.
 */
declare function computeScatterBounds(points: ScatterPoint[]): ScatterBounds;
/**
 * Pure Canvas 2D renderer for Scatter Plots / Bubble Charts.
 */
declare function drawScatterPlot(ctx: CanvasRenderingContext2D, points: ScatterPoint[], bounds: ChartBounds, scatterBounds: ScatterBounds, options?: DrawScatterOptions): void;

interface VortexScatterPlotProps {
    data: ScatterPoint[];
    height?: number;
    className?: string;
    pointColor?: string;
    defaultRadius?: number;
    showTrendLine?: boolean;
    trendLineColor?: string;
    glow?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexScatterPlot: React__default.FC<VortexScatterPlotProps>;

interface HeatmapData {
    xLabels: string[];
    yLabels: string[];
    values: number[][];
    minValue?: number;
    maxValue?: number;
}
interface DrawHeatmapOptions {
    colorScale?: "vortex" | "coolwarm" | "emerald" | "diverging";
    showValues?: boolean;
    cellPadding?: number;
    borderRadius?: number;
    hoveredCell?: {
        row: number;
        col: number;
    } | null;
    yAxisPosition?: "left" | "right";
    formatValue?: (val: number) => string;
}
/**
 * Pure Canvas 2D renderer for 2D Matrix Heatmaps (correlation, activity, seasonality).
 */
declare function drawHeatmap(ctx: CanvasRenderingContext2D, data: HeatmapData, bounds: ChartBounds, options?: DrawHeatmapOptions): void;

interface VortexHeatmapProps {
    data: HeatmapData;
    height?: number;
    className?: string;
    colorScale?: "vortex" | "coolwarm" | "emerald" | "diverging";
    showValues?: boolean;
    cellPadding?: number;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
    yAxisPosition?: "left" | "right";
    formatValue?: (val: number) => string;
}
declare const VortexHeatmap: React__default.FC<VortexHeatmapProps>;

interface AreaDataPoint {
    x?: number;
    y: number;
    label?: string;
}
interface DrawAreaOptions {
    color?: string;
    gradientTopOpacity?: number;
    gradientBottomOpacity?: number;
    lineWidth?: number;
    showLine?: boolean;
    smooth?: boolean;
    glow?: boolean;
}
/**
 * Pure Canvas 2D renderer for Area Charts.
 */
declare function drawAreaChart(ctx: CanvasRenderingContext2D, data: AreaDataPoint[], bounds: ChartBounds, options?: DrawAreaOptions): void;

interface VortexAreaChartProps {
    data: AreaDataPoint[];
    height?: number;
    className?: string;
    color?: string;
    gradientTopOpacity?: number;
    gradientBottomOpacity?: number;
    lineWidth?: number;
    showLine?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexAreaChart: React__default.FC<VortexAreaChartProps>;

interface BoxPlotItem {
    label: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers?: number[];
}
interface DrawBoxPlotOptions {
    boxColor?: string;
    medianColor?: string;
    whiskerColor?: string;
    outlierColor?: string;
}
/**
 * Computes 5-number statistical summary (Min, Q1, Median, Q3, Max) and outliers.
 */
declare function computeBoxPlotStats(rawValues: number[], label?: string): BoxPlotItem;
/**
 * Pure Canvas 2D renderer for statistical Box-and-Whisker Plots.
 */
declare function drawBoxPlot(ctx: CanvasRenderingContext2D, data: BoxPlotItem[], bounds: ChartBounds, options?: DrawBoxPlotOptions): void;

type BoxPlotInputItem = BoxPlotItem | {
    label: string;
    values: number[];
};
interface VortexBoxPlotProps {
    data: BoxPlotInputItem[];
    height?: number;
    className?: string;
    boxColor?: string;
    medianColor?: string;
    whiskerColor?: string;
    outlierColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexBoxPlot: React__default.FC<VortexBoxPlotProps>;

interface WaterfallBar {
    label: string;
    value: number;
    isTotal?: boolean;
}
interface DrawWaterfallOptions {
    positiveColor?: string;
    negativeColor?: string;
    totalColor?: string;
    connectorColor?: string;
}
/**
 * Pure Canvas 2D renderer for Waterfall charts (sequential walk from baseline to total).
 */
declare function drawWaterfallChart(ctx: CanvasRenderingContext2D, bars: WaterfallBar[], bounds: ChartBounds, options?: DrawWaterfallOptions): void;

interface VortexWaterfallChartProps {
    data: WaterfallBar[];
    height?: number;
    className?: string;
    positiveColor?: string;
    negativeColor?: string;
    totalColor?: string;
    connectorColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexWaterfallChart: React__default.FC<VortexWaterfallChartProps>;

interface RadarDimension {
    name: string;
    max?: number;
}
interface RadarSeries {
    name: string;
    values: number[];
    color?: string;
    fillOpacity?: number;
}
interface DrawRadarOptions {
    levels?: number;
    gridColor?: string;
    labelColor?: string;
    showValues?: boolean;
}
/**
 * Pure Canvas 2D renderer for Radar / Spider charts (multidimensional profile comparison).
 */
declare function drawRadarChart(ctx: CanvasRenderingContext2D, dimensions: RadarDimension[], seriesList: RadarSeries[], bounds: ChartBounds, options?: DrawRadarOptions): void;

interface VortexRadarChartProps {
    dimensions: RadarDimension[];
    series: RadarSeries[];
    height?: number;
    className?: string;
    levels?: number;
    gridColor?: string;
    labelColor?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexRadarChart: React__default.FC<VortexRadarChartProps>;

interface PieSlice {
    label: string;
    value: number;
    color?: string;
}
interface DrawPieOptions {
    donutHole?: number;
    hoverIndex?: number | null;
    borderColor?: string;
    showLabels?: boolean;
}
/**
 * Pure Canvas 2D renderer for Pie and Donut charts.
 */
declare function drawPieChart(ctx: CanvasRenderingContext2D, slices: PieSlice[], bounds: ChartBounds, options?: DrawPieOptions): void;

interface VortexPieChartProps {
    data: PieSlice[];
    height?: number;
    className?: string;
    donut?: boolean;
    donutHole?: number;
    borderColor?: string;
    showLabels?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexPieChart: React__default.FC<VortexPieChartProps>;

interface GeoPolygon {
    points: [number, number][];
}
interface GeoRegion {
    id: string;
    name: string;
    value: number;
    polygons: GeoPolygon[];
}
interface DrawChoroplethOptions {
    colorScale?: (ratio: number) => string;
    defaultColor?: string;
    borderColor?: string;
    showLabels?: boolean;
}
/**
 * Pure Canvas 2D renderer for thematic Choropleth Maps.
 */
declare function drawChoropleth(ctx: CanvasRenderingContext2D, regions: GeoRegion[], bounds: ChartBounds, options?: DrawChoroplethOptions): void;

interface VortexChoroplethMapProps {
    regions: GeoRegion[];
    height?: number;
    className?: string;
    borderColor?: string;
    showLabels?: boolean;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
}
declare const VortexChoroplethMap: React__default.FC<VortexChoroplethMapProps>;

interface WhaleBiasPoint {
    scannedAt: number;
    callPct: number;
}
interface DrawBiasOptions {
    bullishColor?: string;
    bearishColor?: string;
    equilibriumValue?: number;
    lineWidth?: number;
    showEquilibrium?: boolean;
    showBeacon?: boolean;
    showGrid?: boolean;
    baselinePoints?: WhaleBiasPoint[];
}
/**
 * Computes standard 0-100% chart bounds tailored for bias / ratio indicators.
 */
declare function computeBiasBounds(width: number, height: number, padding?: ViewportPadding): ChartBounds;
/**
 * Maps chronological points to pixel coordinates within bounds.
 */
declare function getBiasPointCoords(points: WhaleBiasPoint[], bounds: ChartBounds): {
    x: number;
    y: number;
    point: WhaleBiasPoint;
}[];
/**
 * Pure Canvas 2D renderer for Whale Flow Bias Chart.
 */
declare function drawWhaleBiasChart(ctx: CanvasRenderingContext2D, points: WhaleBiasPoint[], bounds: ChartBounds, options?: DrawBiasOptions): void;

interface VortexWhaleBiasChartProps {
    /** Intraday time-series points with scannedAt timestamp and callPct (0-100) */
    points: WhaleBiasPoint[];
    /** Chart height in pixels (defaults to 180) */
    height?: number;
    /** Extra container className */
    className?: string;
    /** Optional bottom caption or summary label */
    label?: string;
    /** Whether to draw official brand watermark */
    showWatermark?: boolean;
    /** Whether to show the 50% equilibrium threshold line */
    showEquilibrium?: boolean;
    /** Optional secondary baseline points (e.g. 1D cumulative reference) drawn as subtle dashed line */
    baselinePoints?: WhaleBiasPoint[];
    /** Color/theme overrides */
    theme?: VortexThemeOverride;
}
declare const VortexWhaleBiasChart: React__default.FC<VortexWhaleBiasChartProps>;

interface MultiAreaSeries {
    name: string;
    color: string;
    data: (AreaDataPoint | number)[];
    gradientTopOpacity?: number;
    gradientBottomOpacity?: number;
    lineWidth?: number;
    smooth?: boolean;
}
interface DrawMultiAreaOptions {
    smooth?: boolean;
    glow?: boolean;
}
/**
 * Pure Canvas 2D renderer for multiple overlapping area series.
 */
declare function drawMultiAreaChart(ctx: CanvasRenderingContext2D, seriesList: MultiAreaSeries[], bounds: ChartBounds, options?: DrawMultiAreaOptions): void;

interface VortexMultiAreaChartProps {
    series: MultiAreaSeries[];
    height?: number;
    className?: string;
    showWatermark?: boolean;
    theme?: VortexThemeOverride;
    formatValue?: (v: number) => string;
    xAxisFormatter?: (index: number) => string;
}
declare const VortexMultiAreaChart: React__default.FC<VortexMultiAreaChartProps>;

interface VortexGaugeProps {
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
declare const VortexGauge: React__default.FC<VortexGaugeProps>;

interface VortexChartControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    isZoomed: boolean;
    zoomLevel?: number | string;
    isRulerActive?: boolean;
    onToggleRuler?: () => void;
    className?: string;
}
declare const VortexChartControls: React__default.FC<VortexChartControlsProps>;

/**
 * Viewport state and calculations for horizontal time-series zooming & panning.
 */
interface ViewportState {
    /** Index of the first visible candle in the series (inclusive, 0-based) */
    startIndex: number;
    /** Index of the last visible candle in the series (inclusive, 0-based) */
    endIndex: number;
    /** Total count of items in the series */
    totalCount: number;
    /** Minimum number of candles visible when fully zoomed in */
    minVisible: number;
}
/**
 * Initializes a full-span viewport encompassing all available candles.
 */
declare function createViewport(totalCount: number, minVisible?: number): ViewportState;
/**
 * Returns true if the viewport is zoomed in (not displaying the entire series).
 */
declare function isViewportZoomed(viewport: ViewportState): boolean;
/**
 * Returns the current zoom multiplier (e.g. 1.0x, 2.5x).
 */
declare function getZoomLevel(viewport: ViewportState): number;
/**
 * Returns the number of currently visible candles in the viewport.
 */
declare function getVisibleCount(viewport: ViewportState): number;
/**
 * Zooms the viewport in or out around an anchor point.
 * @param viewport Current viewport state
 * @param factor > 1 to zoom IN (fewer candles), < 1 to zoom OUT (more candles)
 * @param anchorRatio 0.0 = left edge, 0.5 = center, 1.0 = right edge (cursor X position)
 */
declare function zoomViewport(viewport: ViewportState, factor: number, anchorRatio?: number): ViewportState;
/**
 * Pans the viewport horizontally by a specific number of bars.
 * @param viewport Current viewport state
 * @param deltaBars Positive = scroll earlier in history (left), Negative = scroll later (right)
 * @param allowOverscroll When true, permits dragging past data bounds with bounded elastic overscroll (TradingView style)
 */
declare function panViewport(viewport: ViewportState, deltaBars: number, allowOverscroll?: boolean): ViewportState;
/**
 * Resets the viewport to show all candles.
 */
declare function resetViewport(totalCount: number, minVisible?: number): ViewportState;
/**
 * Creates a viewport showing the LAST `visibleBars` candles (or all of them
 * when the series is shorter). Used for live charts that open on recent data.
 */
declare function createTailViewport(totalCount: number, visibleBars: number, minVisible?: number): ViewportState;
/**
 * Resyncs a viewport after the series grew or shrank while KEEPING the user's
 * zoom level (span) and sliding the window to the newest bars. This is the
 * "follow" mode used by live (SSE) charts so appended candles never reset
 * the zoom. Falls back to a full reset when the series empties.
 */
declare function followViewport(prev: ViewportState, totalCount: number): ViewportState;

interface RulerPoint {
    x: number;
    y: number;
    price: number;
    time?: number;
    index: number;
}
interface RulerState {
    active: boolean;
    startPoint: RulerPoint | null;
    currentPoint: RulerPoint | null;
}
declare function drawRulerOverlay(ctx: CanvasRenderingContext2D, bounds: ChartBounds, ruler: RulerState): void;

/**
 * Memoizes ctx.measureText results keyed by (font, text).
 *
 * measureText is one of the most expensive Canvas calls when repeated every
 * frame (grid labels, axis badges, watermark). Widths for a given
 * font+text pair are deterministic within a session, so a simple Map works.
 */
declare function measureTextWidth(ctx: CanvasRenderingContext2D, text: string): number;

interface HoverState {
    mouseX: number;
    mouseY: number;
    /** Magnetically snapped X (center of the hovered candle) — keeps the crosshair and the tooltip on the same bar */
    snapX: number;
    index: number;
    candle: Candle | null;
}
declare function drawCrosshair(ctx: CanvasRenderingContext2D, bounds: ChartBounds, hover: HoverState, timeText: string): void;
interface GenericCrosshairOptions {
    mouseX: number;
    mouseY: number;
    snapX?: number;
    snapY?: number;
    xLabel?: string;
    yLabel?: string;
    color?: string;
    showSnapDot?: boolean;
}
/**
 * Universal 60 FPS Canvas 2D overlay crosshair with magnetized snap dot,
 * dynamic Y-axis price badge and X-axis timestamp/label badge.
 */
declare function drawGenericCrosshair(ctx: CanvasRenderingContext2D, bounds: ChartBounds, options: GenericCrosshairOptions): void;
/**
 * Formats a raw volume count into readable shorthand (e.g. 1.45M, 240K).
 */
declare function formatVolume(volume?: number): string;
/**
 * Computes price difference and percentage with formatted sign.
 */
declare function formatChange(open: number, close: number): {
    diff: number;
    pct: number;
    isBullish: boolean;
    text: string;
};

interface DrawOhlcOptions {
    upColor?: string;
    downColor?: string;
    lineWidth?: number;
    tickWidth?: number;
}
/**
 * Pure Canvas 2D renderer for western OHLC Bar Charts.
 * Vertical bar from Low to High, left tick for Open, right tick for Close.
 */
declare function drawOhlcBars(ctx: CanvasRenderingContext2D, candles: Candle[], bounds: ChartBounds, options?: DrawOhlcOptions): void;

/**
 * Transforms standard OHLC candles into Heikin-Ashi smoothed candles.
 * Filters intraday market noise and highlights primary directional momentum.
 */
declare function computeHeikinAshi(candles: Candle[]): Candle[];

interface RenkoBrick {
    open: number;
    close: number;
    high: number;
    low: number;
    isUp: boolean;
    t: number;
}
interface DrawRenkoOptions {
    upColor?: string;
    downColor?: string;
    borderColor?: string;
}
/**
 * Transforms candles into time-independent Renko bricks.
 * Each brick represents an exact price movement delta.
 */
declare function computeRenkoBricks(candles: Candle[], brickSize?: number): RenkoBrick[];
/**
 * Pure Canvas 2D renderer for Renko bricks.
 */
declare function drawRenkoBricks(ctx: CanvasRenderingContext2D, bricks: RenkoBrick[], bounds: ChartBounds, options?: DrawRenkoOptions): void;

type PnFType = "X" | "O";
interface PnFColumn {
    type: PnFType;
    boxes: number[];
    t: number;
}
interface DrawPnFOptions {
    xColor?: string;
    oColor?: string;
    gridColor?: string;
}
/**
 * Computes Point and Figure columns from a candle price series.
 * Standard method: High/Low or Close with boxSize and reversal count (default 3).
 */
declare function computePointAndFigure(candles: Candle[], boxSize?: number, reversal?: number): PnFColumn[];
/**
 * Pure Canvas 2D renderer for Point & Figure charts.
 */
declare function drawPointAndFigure(ctx: CanvasRenderingContext2D, columns: PnFColumn[], bounds: ChartBounds, boxSize: number, options?: DrawPnFOptions): void;

interface VolumeProfileBin {
    price: number;
    priceTop: number;
    priceBottom: number;
    volume: number;
    isValueArea: boolean;
    isPoc: boolean;
}
interface VolumeProfileResult {
    bins: VolumeProfileBin[];
    pocPrice: number;
    vahPrice: number;
    valPrice: number;
    totalVolume: number;
    maxBinVolume: number;
}
interface DrawVolumeProfileOptions {
    alignment?: "left" | "right";
    widthRatio?: number;
    pocColor?: string;
    valueAreaColor?: string;
    otherAreaColor?: string;
    showLines?: boolean;
}
/**
 * Computes Volume Profile histogram distribution, POC, VAH, and VAL from candles.
 */
declare function computeVolumeProfile(candles: Candle[], rows?: number, valueAreaRatio?: number): VolumeProfileResult | null;
/**
 * Pure Canvas 2D renderer for horizontal Volume Profile.
 */
declare function drawVolumeProfile(ctx: CanvasRenderingContext2D, profile: VolumeProfileResult, bounds: ChartBounds, options?: DrawVolumeProfileOptions): void;

interface GaugeOptions {
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
declare function drawRadialGauge(ctx: CanvasRenderingContext2D, width: number, height: number, value: number, options?: GaugeOptions): void;

/**
 * Draws the clean "VorteXbot.app" watermark on the Canvas (no third-party or placeholder icon).
 */
declare function drawVortexWatermark(ctx: CanvasRenderingContext2D, bounds: ChartBounds, opacity?: number): void;
/**
 * Reusable React component for interactive VorteXbot.app watermark
 */
declare const VortexWatermarkOverlay: React__default.FC<{
    className?: string;
}>;

/**
 * Lightweight pub/sub bus for multi-chart crosshair synchronization.
 *
 * Charts sharing the same `group` id broadcast their hovered candle timestamp;
 * subscriber charts draw a ghost vertical crosshair at their nearest bar.
 * The store lives at module scope (SSR-safe: no window access, no persistence).
 */
interface CrosshairSyncEvent {
    /** Hovered candle timestamp, or null when the cursor leaves the source chart */
    time: number | null;
    /** Identity of the emitting chart — subscribers skip their own events */
    sourceId: string;
}
type Listener = (event: CrosshairSyncEvent) => void;
declare function subscribeCrosshairSync(group: string, listener: Listener): () => void;
declare function publishCrosshairSync(group: string, event: CrosshairSyncEvent): void;

/**
 * Owns the chart DOM surface: container, main canvas, overlay canvas,
 * container width tracking and devicePixelRatio awareness.
 */
declare function useChartSurface(): {
    containerRef: React.RefObject<HTMLDivElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    overlayRef: React.RefObject<HTMLCanvasElement | null>;
    containerWidth: number;
    dpr: number;
};

interface UseChartViewportOptions {
    /**
     * "reset" (default): full view every time the series length changes.
     * "follow": keep the user's zoom span and slide the window to the newest
     * bars — designed for live-updating (SSE/WebSocket) series.
     */
    mode?: "reset" | "follow";
    /** Open the chart on the last N bars instead of the full series */
    initialVisibleBars?: number;
}
/**
 * Encapsulates interactive viewport state (zoom & pan) with automatic
 * resynchronization when the underlying series length changes.
 */
declare function useChartViewport(totalCount: number, minVisible?: number, options?: UseChartViewportOptions): {
    viewport: ViewportState;
    setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
    priceScaleRatio: number;
    setPriceScaleRatio: React.Dispatch<React.SetStateAction<number>>;
    resetPriceScale: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    pan: (deltaBars: number) => void;
    isZoomed: boolean;
    zoomLevel: string | number;
};

type ChartHoverZone = "plot" | "yAxis" | "xAxis";
interface UseChartPointerOptions {
    /** Main canvas (receives the pointer events) */
    canvasRef: React__default.RefObject<HTMLCanvasElement | null>;
    /** Current chart bounds (kept fresh through closures, refs for native listeners) */
    bounds: ChartBounds;
    /** Visible candle slice used for hit-testing */
    visible: Candle[];
    /**
     * Total number of X slots for hit-testing. Defaults to `visible.length`.
     * The cone chart passes history + future projection slots.
     */
    slotCount?: number;
    /** Global index of the first visible candle (viewport pan offset) */
    indexOffset?: number;
    /** Slot offset when visible slice is shifted by overscroll */
    slotOffset?: number;
    /**
     * Time-based X mapping. When provided (and the visible slice is non-empty),
     * hit-testing resolves the hovered candle by timestamp instead of slot index.
     */
    timeScale?: TimeScaleMapping | null;
    /** Enable wheel zoom + drag pan (candle & range charts) */
    panZoom?: boolean;
    /** Allow direct manipulation dragging past dataset boundaries */
    allowOverscroll?: boolean;
    /** Current viewport state — required when panZoom is enabled */
    viewport?: ViewportState;
    /** Viewport setter — required when panZoom is enabled */
    onViewportChange?: (viewport: ViewportState) => void;
    /** Current vertical price scale factor (from useChartViewport) */
    priceScaleRatio?: number;
    /** Setter for vertical price scale factor */
    onPriceScaleRatioChange?: (ratio: number) => void;
    /** Reset callback for vertical price scale */
    onResetPriceScale?: () => void;
    /** Reset callback for horizontal zoom */
    onReset?: () => void;
}
/**
 * Centralizes pointer-driven interaction:
 * - Hover crosshair state with magnetized candle snap
 * - Ruler measurement (Shift+drag or toolbar)
 * - Independent X-axis (Time) scaling via left-click drag & mouse wheel
 * - Independent Y-axis (Price) scaling via left-click drag & mouse wheel
 * - Viewport pan and zoom in the plot area
 * - Double-click auto-fit reset (targeted per axis or global)
 */
declare function useChartPointer({ canvasRef, bounds, visible, slotCount, slotOffset, indexOffset, timeScale, panZoom, allowOverscroll, viewport, onViewportChange, priceScaleRatio: externalPriceRatio, onPriceScaleRatioChange, onResetPriceScale, onReset, }: UseChartPointerOptions): {
    hover: HoverState | null;
    hoverZone: ChartHoverZone;
    priceScaleRatio: number;
    resetPriceScale: () => void;
    cursorStyle: string;
    ruler: RulerState;
    isRulerToolActive: boolean;
    toggleRuler: () => void;
    clearRuler: () => void;
    pointerHandlers: {
        onPointerDown: (e: React__default.PointerEvent<HTMLCanvasElement>) => void;
        onPointerMove: (e: React__default.PointerEvent<HTMLCanvasElement>) => void;
        onPointerUp: () => void;
        onPointerCancel: () => void;
        onPointerLeave: () => void;
        onDoubleClick: (e: React__default.MouseEvent<HTMLCanvasElement>) => void;
    };
};

interface UseCrosshairSyncOptions {
    /** Shared group id — charts with the same group synchronize their crosshairs */
    group?: string;
    /** Local hovered candle timestamp (null when idle) — broadcast to the group */
    localTime: number | null;
    /** Receives the hovered timestamp of remote charts in the group */
    onRemoteTime: (time: number | null) => void;
}
/**
 * Wires a chart into a crosshair synchronization group.
 * Publishes the local hover timestamp and forwards remote events,
 * ignoring events emitted by this very chart (sourceId comparison).
 */
declare function useCrosshairSync({ group, localTime, onRemoteTime }: UseCrosshairSyncOptions): {
    sourceId: string;
};

/**
 * Formats a candle timestamp. Intraday candles show HH:mm, daily candles
 * show the LOCAL calendar date. Pass `timeZone` (e.g. "America/New_York")
 * to pin the labels to a market timezone instead of the browser's.
 */
declare function formatCandleTime(timestampMs: number, isIntraday?: boolean, timeZone?: string): string;
/**
 * Adaptive price formatting:
 * - >= 10 000  : grouped thousands, 2 decimals (indices, BTC)
 * - >= 0.01    : fixed 2 decimals (equities)
 * - < 0.01     : 4 significant digits (sub-cent crypto assets)
 */
declare function formatPrice(price: number): string;

/**
 * Safely applies an alpha channel (0..1) to any color format (HEX, RGB, RGBA, HSL, HSLA).
 */
declare function colorWithAlpha(color: string, alpha: number): string;

export { type AreaDataPoint, type BarDatum, type BarReferenceLine, type BoxPlotInputItem, type BoxPlotItem, type Candle, type ChartHoverZone, type ChartZone, type CrosshairSyncEvent, type DrawAreaOptions, type DrawBiasOptions, type DrawBoxPlotOptions, type DrawChoroplethOptions, type DrawFootprintOptions, type DrawHeatmapOptions, type DrawLineOptions, type DrawMultiAreaOptions, type DrawOhlcOptions, type DrawPieOptions, type DrawPnFOptions, type DrawRadarOptions, type DrawRenkoOptions, type DrawScatterOptions, type DrawVolumeProfileOptions, type DrawWaterfallOptions, type ExpectedMoveSpec, type FootprintBar, type FootprintLevel, type GaugeOptions, type GenericCrosshairOptions, type GeoPolygon, type GeoRegion, type HeatmapData, type LineSeriesPoint, type MultiAreaSeries, type MultiLineSeries, type PieSlice, type PnFColumn, type PnFType, type PremarketRange, type PriceLine, type PriorDayRange, type RadarDimension, type RadarSeries, type RenkoBrick, type RulerPoint, type RulerState, type ScatterBounds, type ScatterPoint, type TargetRange, type TickData, type TimeScaleMapping, VORTEX_THEME, type VerticalScaleOptions, type ViewportState, type VolumeProfileBin, type VolumeProfileResult, VortexAreaChart, type VortexAreaChartProps, VortexBarChart, type VortexBarChartProps, VortexBoxPlot, type VortexBoxPlotProps, VortexCandleChart, type VortexCandleChartProps, VortexChartControls, type VortexChartControlsProps, VortexChoroplethMap, type VortexChoroplethMapProps, VortexConeChart, type VortexConeChartProps, VortexFootprintChart, type VortexFootprintChartProps, VortexGauge, type VortexGaugeProps, VortexHeatmap, type VortexHeatmapProps, VortexHeikinAshiChart, type VortexHeikinAshiChartProps, VortexLineChart, type VortexLineChartProps, VortexMultiAreaChart, type VortexMultiAreaChartProps, VortexMultiLineChart, type VortexMultiLineChartProps, VortexOhlcChart, type VortexOhlcChartProps, VortexPieChart, type VortexPieChartProps, VortexPointFigureChart, type VortexPointFigureChartProps, VortexRadarChart, type VortexRadarChartProps, VortexRangeBarChart, type VortexRangeBarChartProps, VortexRangeChart, type VortexRangeChartProps, VortexRenkoChart, type VortexRenkoChartProps, VortexScatterPlot, type VortexScatterPlotProps, type VortexThemeOverride, VortexVolumeProfileChart, type VortexVolumeProfileChartProps, VortexWaterfallChart, type VortexWaterfallChartProps, VortexWatermarkOverlay, VortexWhaleBiasChart, type VortexWhaleBiasChartProps, type VwapPoint, type WaterfallBar, type WhaleBiasPoint, colorWithAlpha, computeBarBounds, computeBiasBounds, computeBoxPlotStats, computeHeikinAshi, computePointAndFigure, computeRangeBars, computeRenkoBricks, computeScatterBounds, computeVolumeProfile, computeZoneRect, createTailViewport, createViewport, drawAreaChart, drawBarChart, drawBarHoverBand, drawBoxPlot, drawChartZones, drawChoropleth, drawCrosshair, drawFootprintChart, drawGenericCrosshair, drawHeatmap, drawLineChart, drawMultiAreaChart, drawOhlcBars, drawPieChart, drawPointAndFigure, drawRadarChart, drawRadialGauge, drawRenkoBricks, drawRulerOverlay, drawScatterPlot, drawVolumeProfile, drawVortexWatermark, drawWaterfallChart, drawWhaleBiasChart, followViewport, formatCandleTime, formatChange, formatPrice, formatVolume, getBiasPointCoords, getVisibleCount, getZoomLevel, isViewportZoomed, measureTextWidth, nearestDatumIndex, nearestTimeIndex, panViewport, parseZoneColor, publishCrosshairSync, resetViewport, subscribeCrosshairSync, thinLabels, timeToX, useChartPointer, useChartSurface, useChartViewport, useCrosshairSync, viewportIndexToX, viewportXToIndex, xToTime, zoomViewport };
