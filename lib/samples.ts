import type { SecurityResearch } from "./domain";

function seededHistory(seed: number, start: number, drift: number, volatility: number) {
  let state = seed >>> 0;
  let price = start;
  const points = [];
  const startDate = new Date(Date.UTC(2021, 0, 29));
  for (let month = 0; month < 60; month++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const random = state / 0xffffffff - 0.5;
    const cycle = Math.sin(month / 6) * volatility * 0.24;
    price = Math.max(1, price * (1 + drift + random * volatility + cycle));
    const date = new Date(startDate);
    date.setUTCMonth(startDate.getUTCMonth() + month);
    points.push({ date: date.toISOString().slice(0, 10), close: Number(price.toFixed(2)) });
  }
  return points;
}

const methodology = {
  label: "Longview deterministic valuation methodology",
  publisher: "Longview Research",
  url: "/#methodology",
  asOf: "2026-08-03",
  kind: "methodology" as const,
};

export const sampleResearch: Record<string, SecurityResearch> = {
  NVDA: {
    identity: { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "Nasdaq", exchangeCode: "NMS", country: "United States", currency: "USD", type: "Common equity", timezone: "America/New_York" },
    price: 178.62,
    previousClose: 176.14,
    asOf: "Illustrative snapshot · 2026-07-31",
    mode: "sample",
    priceHistory: seededHistory(7654, 13, 0.052, 0.19),
    fundamentals: { fcfPerShare: 4.25, eps: 4.8, revenueGrowth: 0.22, operatingMargin: 0.58, roic: 0.67, netDebtPerShare: -1.7, peerPeLow: 24, peerPeMedian: 34, peerPeHigh: 45 },
    sources: [
      { label: "Illustrative model-ready company snapshot", publisher: "Longview demo dataset", url: "#sources", asOf: "2026-07-31", kind: "demo" },
      methodology,
    ],
    coverage: { identity: true, price: true, history: true, fundamentals: true, peers: true },
    note: "Demonstration values are frozen and illustrative. They are not current market data.",
  },
  "D05.SI": {
    identity: { symbol: "D05.SI", name: "DBS Group Holdings Ltd", exchange: "Singapore Exchange", exchangeCode: "SES", country: "Singapore", currency: "SGD", type: "Common equity", timezone: "Asia/Singapore" },
    price: 52.4,
    previousClose: 52.05,
    asOf: "Illustrative snapshot · 2026-07-31",
    mode: "sample",
    priceHistory: seededHistory(2026, 22, 0.018, 0.09),
    fundamentals: { eps: 4.15, revenueGrowth: 0.06, operatingMargin: 0.47, roic: 0.15, netDebtPerShare: 0, peerPeLow: 9, peerPeMedian: 12, peerPeHigh: 15 },
    sources: [
      { label: "Illustrative bank comparison snapshot", publisher: "Longview demo dataset", url: "#sources", asOf: "2026-07-31", kind: "demo" },
      methodology,
    ],
    coverage: { identity: true, price: true, history: true, fundamentals: false, peers: true },
    note: "Banks require a residual-income model. The generic free-cash-flow DCF is intentionally disabled.",
  },
  "0700.HK": {
    identity: { symbol: "0700.HK", name: "Tencent Holdings Limited", exchange: "Hong Kong Stock Exchange", exchangeCode: "HKG", country: "Hong Kong", currency: "HKD", type: "Common equity", timezone: "Asia/Hong_Kong" },
    price: 598,
    previousClose: 592,
    asOf: "Illustrative snapshot · 2026-07-31",
    mode: "sample",
    priceHistory: seededHistory(700, 415, 0.011, 0.11),
    fundamentals: { fcfPerShare: 25.6, eps: 21.8, revenueGrowth: 0.11, operatingMargin: 0.31, roic: 0.22, netDebtPerShare: -18, peerPeLow: 18, peerPeMedian: 25, peerPeHigh: 32 },
    sources: [
      { label: "Illustrative model-ready company snapshot", publisher: "Longview demo dataset", url: "#sources", asOf: "2026-07-31", kind: "demo" },
      methodology,
    ],
    coverage: { identity: true, price: true, history: true, fundamentals: true, peers: true },
    note: "Demonstration values are frozen and illustrative. They are not current market data.",
  },
  "ASML.AS": {
    identity: { symbol: "ASML.AS", name: "ASML Holding N.V.", exchange: "Euronext Amsterdam", exchangeCode: "AMS", country: "Netherlands", currency: "EUR", type: "Common equity", timezone: "Europe/Amsterdam" },
    price: 886.3,
    previousClose: 879.1,
    asOf: "Illustrative snapshot · 2026-07-31",
    mode: "sample",
    priceHistory: seededHistory(1984, 315, 0.02, 0.12),
    fundamentals: { fcfPerShare: 23.2, eps: 23.7, revenueGrowth: 0.13, operatingMargin: 0.33, roic: 0.48, netDebtPerShare: -8.5, peerPeLow: 25, peerPeMedian: 34, peerPeHigh: 43 },
    sources: [
      { label: "Illustrative model-ready company snapshot", publisher: "Longview demo dataset", url: "#sources", asOf: "2026-07-31", kind: "demo" },
      methodology,
    ],
    coverage: { identity: true, price: true, history: true, fundamentals: true, peers: true },
    note: "Demonstration values are frozen and illustrative. They are not current market data.",
  },
};

export const sampleList = Object.values(sampleResearch).map(({ identity, price, asOf }) => ({ ...identity, price, asOf }));
