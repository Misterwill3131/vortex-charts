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
    theme?: Partial<typeof VORTEX_THEME>;
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
    theme?: Partial<typeof VORTEX_THEME>;
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
    theme?: Partial<typeof VORTEX_THEME>;
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
 */
declare function panViewport(viewport: ViewportState, deltaBars: number): ViewportState;
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
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    pan: (deltaBars: number) => void;
    isZoomed: boolean;
    zoomLevel: number;
};

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
    /**
     * Time-based X mapping. When provided (and the visible slice is non-empty),
     * hit-testing resolves the hovered candle by timestamp instead of slot index.
     */
    timeScale?: TimeScaleMapping | null;
    /** Enable wheel zoom + drag pan (candle & range charts) */
    panZoom?: boolean;
    /** Current viewport state — required when panZoom is enabled */
    viewport?: ViewportState;
    /** Viewport setter — required when panZoom is enabled */
    onViewportChange?: (viewport: ViewportState) => void;
}
/**
 * Centralizes pointer-driven interaction: hover crosshair state, ruler
 * measurement, drag panning and wheel zooming.
 *
 * - Uses Pointer Events (mouse, touch and pen in a single API).
 * - Coalesces hover / ruler / pan updates through requestAnimationFrame so
 *   at most one state update per display frame reaches React.
 * - Snaps hover to candle centers (magnetized crosshair).
 */
declare function useChartPointer({ canvasRef, bounds, visible, slotCount, indexOffset, timeScale, panZoom, viewport, onViewportChange, }: UseChartPointerOptions): {
    hover: HoverState | null;
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

export { type BarDatum, type BarReferenceLine, type Candle, type ChartZone, type CrosshairSyncEvent, type ExpectedMoveSpec, type PremarketRange, type PriceLine, type PriorDayRange, type RulerPoint, type RulerState, type TargetRange, type TimeScaleMapping, VORTEX_THEME, type ViewportState, VortexBarChart, type VortexBarChartProps, VortexCandleChart, type VortexCandleChartProps, VortexChartControls, type VortexChartControlsProps, VortexConeChart, type VortexConeChartProps, VortexRangeChart, type VortexRangeChartProps, VortexWatermarkOverlay, type VwapPoint, computeBarBounds, computeZoneRect, createTailViewport, createViewport, drawBarChart, drawBarHoverBand, drawChartZones, drawRulerOverlay, drawVortexWatermark, followViewport, formatCandleTime, formatChange, formatPrice, formatVolume, getVisibleCount, getZoomLevel, isViewportZoomed, measureTextWidth, nearestDatumIndex, nearestTimeIndex, panViewport, parseZoneColor, publishCrosshairSync, resetViewport, subscribeCrosshairSync, thinLabels, timeToX, useChartPointer, useChartSurface, useChartViewport, useCrosshairSync, viewportIndexToX, viewportXToIndex, xToTime, zoomViewport };
