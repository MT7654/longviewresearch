export type PricePoint = { date: string; close: number };

export type SecurityIdentity = {
  symbol: string;
  name: string;
  exchange: string;
  exchangeCode?: string;
  country: string;
  currency: string;
  type: string;
  timezone?: string;
};

export type Fundamentals = {
  fcfPerShare?: number;
  eps?: number;
  revenueGrowth?: number;
  operatingMargin?: number;
  roic?: number;
  netDebtPerShare?: number;
  sharesOutstanding?: number;
  peerPeLow?: number;
  peerPeMedian?: number;
  peerPeHigh?: number;
};

export type SourceRecord = {
  label: string;
  publisher: string;
  url: string;
  asOf: string;
  kind: "market" | "filing" | "methodology" | "demo";
};

export type SecurityResearch = {
  identity: SecurityIdentity;
  price: number | null;
  previousClose?: number | null;
  asOf: string;
  mode: "live" | "sample" | "unverified";
  priceHistory: PricePoint[];
  fundamentals: Fundamentals;
  sources: SourceRecord[];
  coverage: {
    identity: boolean;
    price: boolean;
    history: boolean;
    fundamentals: boolean;
    peers: boolean;
  };
  note?: string;
};

export type ValuationAssumptions = {
  fcfPerShare: number;
  forecastYears: number;
  growthRate: number;
  discountRate: number;
  terminalGrowth: number;
  netDebtPerShare: number;
  eps: number;
  targetPe: number;
};

export type TutorResponse = {
  mode: "gemini" | "deterministic";
  model?: string;
  summary: string;
  pressurePoints: string[];
  lesson: string;
};
