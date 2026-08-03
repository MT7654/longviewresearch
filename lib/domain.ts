export type PricePoint = { date: string; close: number };

export type PublicArticle = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  relatedTickers: string[];
};

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
  kind: "market" | "filing" | "methodology" | "demo" | "news" | "fundamentals";
  tier?: "primary" | "secondary" | "methodology" | "demonstration";
  claim?: string;
  reliability?: "high" | "medium" | "illustrative";
  retrievedAt?: string;
};

export type SecurityResearch = {
  identity: SecurityIdentity;
  price: number | null;
  previousClose?: number | null;
  asOf: string;
  mode: "live" | "sample" | "unverified";
  priceHistory: PricePoint[];
  historyInterval?: "daily" | "monthly";
  fundamentals: Fundamentals;
  articles?: PublicArticle[];
  sources: SourceRecord[];
  coverage: {
    identity: boolean;
    price: boolean;
    history: boolean;
    fundamentals: boolean;
    peers: boolean;
    articles?: boolean;
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

export type HypothesisProfile = {
  attention: "product" | "news" | "price" | "mentioned" | "curious" | "unsure";
  understanding: "new" | "some" | "comfortable";
  hypothesis: string;
};

export type EvidenceRecord = {
  id: string;
  layer: "Observed fact" | "Deterministic calculation" | "Source interpretation" | "Longview model opinion";
  tier: "Primary" | "Secondary" | "Methodology" | "Demonstration";
  direction: "supports" | "challenges" | "context" | "limitation";
  title: string;
  detail: string;
  sourceLabel: string;
  asOf: string;
  url?: string;
  theme?: string;
};

export type CoverageLevel = "full" | "partial" | "research-only";

export type NarrativeSignals = {
  articleCount: number;
  publisherCount: number;
  sourceDiversity: number;
  themeEntropy: number;
  recentCount: number;
  dominantTheme: string;
  dominantShare: number;
  hypothesisMatches: number;
  supports: number;
  challenges: number;
  context: number;
  themes: Array<{ theme: string; count: number }>;
};

export type EducationalOpinion = {
  title: string;
  dek: string;
  coverage: CoverageLevel;
  hypothesisStatus: "Exploratory" | "Partially supported" | "Mixed evidence" | "Challenged" | "Presently unanswerable";
  modelRange: { low: number; midpoint: number; high: number } | null;
  impliedGrowth: number | null;
  thesis: string;
  counterThesis: string;
  modelOpinion: string;
  variablesToMonitor: string[];
  unresolvedQuestions: string[];
  evidence: EvidenceRecord[];
  narrative: NarrativeSignals;
};
