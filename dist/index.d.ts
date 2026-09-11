import React from 'react';

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
    theme?: Partial<typeof VORTEX_THEME>;
}
declare const VortexCandleChart: React.FC<VortexCandleChartProps>;

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
    theme?: Partial<typeof VORTEX_THEME>;
}
declare const VortexRangeChart: React.FC<VortexRangeChartProps>;

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
    theme?: Partial<typeof VORTEX_THEME>;
}
declare const VortexConeChart: React.FC<VortexConeChartProps>;

interface VortexChartControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    isZoomed: boolean;
    zoomLevel?: number;
    isRulerActive?: boolean;
    onToggleRuler?: () => void;
    className?: string;
}
declare const VortexChartControls: React.FC<VortexChartControlsProps>;

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
 */
declare function panViewport(viewport: ViewportState, deltaBars: number): ViewportState;
/**
 * Resets the viewport to show all candles.
 */
declare function resetViewport(totalCount: number, minVisible?: number): ViewportState;

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
interface ViewportLike {
    startIndex: number;
    endIndex: number;
    totalCount: number;
}
/**
 * Maps a global data index to an X coordinate using the active viewport window.
 */
declare function viewportIndexToX(globalIndex: number, viewport: ViewportLike, bounds: ChartBounds): number;
/**
 * Maps an X coordinate on the chart to a global data index using the active viewport window.
 */
declare function viewportXToIndex(x: number, viewport: ViewportLike, bounds: ChartBounds): number;

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

/**
 * Draws the clean "VorteXbot.app" watermark on the Canvas (no third-party or placeholder icon).
 */
declare function drawVortexWatermark(ctx: CanvasRenderingContext2D, bounds: ChartBounds, opacity?: number): void;
/**
 * Reusable React component for interactive VorteXbot.app watermark
 */
declare const VortexWatermarkOverlay: React.FC<{
    className?: string;
}>;

declare function formatCandleTime(timestampMs: number, isIntraday?: boolean): string;
declare function formatPrice(price: number): string;

export { type Candle, type ExpectedMoveSpec, type PremarketRange, type PriceLine, type PriorDayRange, type RulerPoint, type RulerState, type TargetRange, VORTEX_THEME, type ViewportState, VortexCandleChart, type VortexCandleChartProps, VortexChartControls, type VortexChartControlsProps, VortexConeChart, type VortexConeChartProps, VortexRangeChart, type VortexRangeChartProps, VortexWatermarkOverlay, type VwapPoint, createViewport, drawRulerOverlay, drawVortexWatermark, formatCandleTime, formatChange, formatPrice, formatVolume, getVisibleCount, getZoomLevel, isViewportZoomed, panViewport, resetViewport, viewportIndexToX, viewportXToIndex, zoomViewport };
