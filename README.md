# vortex-charts

> Official financial and quantitative charting library for the **VorteX** platform. Reusable across all VorteX applications, micro-frontends, and dashboards.

[![NPM Version](https://img.shields.io/badge/version-0.7.1-cyan.svg)](https://github.com/Misterwill3131/vortex-charts)
[![VorteX Theme](https://img.shields.io/badge/theme-vortex--dark-purple.svg)](https://github.com/Misterwill3131/vortex-charts)
[![License](https://img.shields.io/badge/license-UNLICENSED-rose.svg)](https://github.com/Misterwill3131/vortex-charts)

---

## âš¡ Highlights

- **VorteX Dark Glassmorphic Design**: `#020616` dark background, `#38bdf8` (Spot Cyan), `#10b981` (Bullish Green), `#f43f5e` (Bearish Crimson), `#c084fc` (VWAP Lilac), `#eab308` (Gold / Target).
- **High Performance**: Pure native Canvas 2D rendering engine â€” zero third-party charting dependencies (0% TradingView). Dual-canvas architecture (data layer + interaction overlay), `requestAnimationFrame`-coalesced pointer updates, conditional GPU backing-store reallocation, Pointer Events (mouse / touch / pen), memoized `measureText`.
- **Crisp on any display**: `devicePixelRatio`-aware rendering with live multi-monitor Retina re-detection, magnetized crosshair snapping to candle centers and wicks, rAF-coalesced resize tracking.
- **Gap-aware time scale**: optional `timeScale` mode maps X to real timestamps â€” weekends and market pauses render as proportional empty space instead of false equidistant bars.
- **Multi-chart crosshair sync**: pass the same `crosshairSyncGroup` id to several charts to synchronize their crosshairs (ghost line at the nearest bar, tolerance-aware).
- **Client & SSR Ready**: Shipped with `"use client";` banners on both ESM/CJS bundles and complete TypeScript types.
- **Dedicated Quantitative Components**:
  - `VortexCandleChart`: Multi-timeframe candlesticks with dynamic price lines, high/low swings, ATR bounds, time-anchored zones (FVG gaps), live `follow` viewport mode and market-timezone axis labels.
  - `VortexRangeChart`: Session structure visualization (Prior-Day range boxes, Premarket range boxes, and anchored VWAP curve).
  - `VortexConeChart`: Options expected move and forward volatility cone projections.
  - `VortexBarChart`: Sign-based or grouped histograms with line overlay and vertical reference lines (GEX profiles, gamma-by-expiry).

---

## ðŸ“¦ Installation

Install directly from GitHub via npm:

```bash
npm install github:Misterwill3131/vortex-charts#main
```

Or via yarn / pnpm:

```bash
pnpm add github:Misterwill3131/vortex-charts#main
```

---

## ðŸš€ Quick Start

### 1. Candlestick Chart (`VortexCandleChart`)

```tsx
import { VortexCandleChart } from "vortex-charts";

const candles = [
  { t: 1726056000000, open: 580.2, high: 584.5, low: 579.8, close: 583.1 },
  { t: 1726142400000, open: 583.1, high: 588.0, low: 582.4, close: 587.4 },
];

export function MyChart() {
  return (
    <VortexCandleChart
      candles={candles}
      height={320}
      timeScale               // gap-aware X mapping (recommended for daily+)
      crosshairSyncGroup="main"  // sync crosshairs with other charts in group "main"
      priceLines={[
        { price: 580.0, color: "#10b981", title: "Key Support", lineStyle: "dashed" },
        { price: 590.0, color: "#f43f5e", title: "Resistance", lineStyle: "dashed" },
      ]}
    />
  );
}
```

### 2. Session Range Boxes & VWAP (`VortexRangeChart`)

```tsx
import { VortexRangeChart } from "vortex-charts";

export function SessionChart({ candles, priorDay, premarket, vwapSeries }) {
  return (
    <VortexRangeChart
      candles={candles}
      priorDay={priorDay}
      premarket={premarket}
      vwapSeries={vwapSeries}
      crosshairSyncGroup="main"  // same group as VortexCandleChart above
      overlayMode="all" // "all" | "boxes" | "vwap" | "none"
      height={300}
    />
  );
}
```

### 3. Expected Move Cone (`VortexConeChart`)

```tsx
import { VortexConeChart } from "vortex-charts";

export function ConeChart({ candles, currentPrice, rangeHigh, rangeLow, expirationDate }) {
  return (
    <VortexConeChart
      candles={candles}
      currentPrice={currentPrice}
      expirationDate={expirationDate}
      dte={1}
      rangeHigh={rangeHigh}
      rangeLow={rangeLow}
      height={280}
    />
  );
}
```

---

## ðŸŽ¨ Theme Tokens

You can import and inspect the standard VorteX design tokens:

```ts
import { VORTEX_THEME } from "vortex-charts";

console.log(VORTEX_THEME.colors.spot);    // #38bdf8
console.log(VORTEX_THEME.colors.bullish); // #10b981
console.log(VORTEX_THEME.colors.bearish); // #f43f5e
console.log(VORTEX_THEME.colors.vwap);    // #c084fc
console.log(VORTEX_THEME.colors.neutral); // #eab308
```

---

## ðŸ› ï¸ Development & Building

```bash
# Clone
git clone git@github.com:Misterwill3131/vortex-charts.git
cd vortex-charts

# Install
npm install

# Build
npm run build
```

---

## ðŸ”’ License

Proprietary & Confidential - VorteX Trading Systems Â© 2026.
