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

export { type Candle, type ExpectedMoveSpec, type PremarketRange, type PriceLine, type PriorDayRange, type TargetRange, VORTEX_THEME, VortexCandleChart, type VortexCandleChartProps, VortexConeChart, type VortexConeChartProps, VortexRangeChart, type VortexRangeChartProps, VortexWatermarkOverlay, type VwapPoint, drawVortexWatermark, formatCandleTime, formatPrice };
