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

export type GammaLevelKind =
  | "callWall"
  | "putWall"
  | "maxPain"
  | "flip"
  | "pin"
  | "gexKing"
  | "vwap";

export type GammaLevel = {
  price: number;
  kind: GammaLevelKind;
  label: string;
  tag?: string;
};

export type GammaProfilePoint = { strike: number; gex: number };

export type LevelChip = {
  y: number;
  price: number;
  kinds: GammaLevelKind[];
  text: string;
};
