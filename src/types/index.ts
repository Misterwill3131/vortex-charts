export type Candle = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PriceLine = {
  price: number;
  color: string;
  title: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: "solid" | "dotted" | "dashed";
  axisLabelVisible?: boolean;
};

export type PriorDayRange = {
  high: number;
  low: number;
  mid: number;
};

export type PremarketRange = {
  high: number;
  low: number;
  mid: number;
};

export type VwapPoint = {
  t: number;
  vwap: number;
};

export type ExpectedMoveSpec = {
  movePct: number;
  moveAbs: number;
  strike?: number;
  expiration: string;
  dte?: number;
};

export type TargetRange = {
  high: number;
  low: number;
};
