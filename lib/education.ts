import type {
  CoverageLevel,
  EducationalOpinion,
  EvidenceRecord,
  HypothesisProfile,
  SecurityResearch,
  ValuationAssumptions,
} from "./domain";
import { dcfPerShare, monteCarloValuation, reverseDcfGrowth, riskMetrics } from "./quant";

const sampleContext: Record<string, {
  business: string;
  support: string;
  challenge: string;
  monitor: string[];
  questions: string[];
}> = {
  NVDA: {
    business: "The demonstration snapshot describes a high-margin semiconductor platform with strong recent growth and cash generation.",
    support: "The operating profile is consistent with a business benefiting from accelerated-computing demand.",
    challenge: "A strong business can still carry demanding expectations. The reverse DCF tests how much continued execution the reference price requires.",
    monitor: ["Data-centre demand", "Operating margin durability", "Customer concentration", "Capital expenditure by major buyers"],
    questions: ["How durable is current demand?", "How quickly could competition alter margins?", "How much future growth is already reflected in price?"],
  },
  "0700.HK": {
    business: "The demonstration snapshot describes a diversified digital platform with positive cash generation and moderate growth.",
    support: "Multiple business lines can make cash generation more resilient than a single-product thesis suggests.",
    challenge: "Platform regulation, capital allocation and the quality of growth can matter as much as headline revenue.",
    monitor: ["Advertising demand", "Gaming regulation", "Cloud margins", "Capital returns"],
    questions: ["Which segment drives incremental cash flow?", "How should regulatory uncertainty be reflected?", "Are peer multiples genuinely comparable?"],
  },
  "ASML.AS": {
    business: "The demonstration snapshot describes a high-quality semiconductor-equipment business with substantial margins and returns on capital.",
    support: "A specialised competitive position can support durable economics when customer investment remains strong.",
    challenge: "Cyclicality, export restrictions and customer capital-spending decisions can make linear growth assumptions fragile.",
    monitor: ["Order backlog", "Advanced-node investment", "Export restrictions", "Customer concentration"],
    questions: ["How cyclical is the order book?", "Which restrictions affect accessible demand?", "Does the model over-rely on terminal value?"],
  },
  "D05.SI": {
    business: "The demonstration snapshot describes a bank, where deposits, capital and credit losses shape value differently from an industrial company.",
    support: "Profitability and capital-return measures are relevant to the learning hypothesis.",
    challenge: "A generic free-cash-flow DCF is not an appropriate primary model for a bank, so Longview intentionally withholds it.",
    monitor: ["Net interest margin", "Credit costs", "Capital adequacy", "Loan growth"],
    questions: ["How should excess capital be valued?", "What credit-loss assumptions are reasonable?", "Why is residual income more suitable than industrial-company FCF?"],
  },
};

export const defaultHypothesis: HypothesisProfile = {
  attention: "curious",
  understanding: "new",
  hypothesis: "",
};

export function coverageLevel(research: SecurityResearch): CoverageLevel {
  if (research.coverage.fundamentals && research.coverage.history) return "full";
  if (research.coverage.price || research.coverage.history) return "partial";
  return "price-only";
}

export function containsAdviceRequest(value: string) {
  return /\b(should i|buy|sell|hold|position size|how much|entry price|exit price|worth investing|suitable for me)\b/i.test(value);
}

export function learningPrompt(profile: HypothesisProfile, company: string) {
  const startingPoint = profile.hypothesis.trim()
    ? `You want to test: “${profile.hypothesis.trim()}”`
    : `You are exploring ${company} without a fixed thesis yet.`;
  const emphasis = {
    product: "The lesson will separate product enthusiasm from company economics and market expectations.",
    news: "The lesson will distinguish a recent narrative from durable evidence.",
    price: "The lesson will separate a price move from changes in business value.",
    mentioned: "The lesson will turn a borrowed idea into independently testable claims.",
    curious: "The lesson will build a structured view from first principles.",
    unsure: "The lesson will begin with the basics and avoid assuming prior knowledge.",
  }[profile.attention];
  return { startingPoint, emphasis };
}

function genericEvidence(research: SecurityResearch, assumptions: ValuationAssumptions): EvidenceRecord[] {
  const risk = riskMetrics(research.priceHistory);
  const implied = research.price ? reverseDcfGrowth(research.price, assumptions) : null;
  const context = sampleContext[research.identity.symbol];
  const items: EvidenceRecord[] = [];

  if (context) {
    items.push(
      {
        id: "business-snapshot",
        layer: "Observed fact",
        tier: "Demonstration",
        direction: "context",
        title: "Model-ready business snapshot",
        detail: context.business,
        sourceLabel: "Frozen Longview demonstration dataset",
        asOf: research.asOf,
      },
      {
        id: "supporting-context",
        layer: "Source interpretation",
        tier: "Demonstration",
        direction: "supports",
        title: "Evidence that supports the starting idea",
        detail: context.support,
        sourceLabel: "Longview interpretation of the demonstration snapshot",
        asOf: research.asOf,
      },
      {
        id: "challenging-context",
        layer: "Longview model opinion",
        tier: "Methodology",
        direction: "challenges",
        title: "The strongest counterweight",
        detail: context.challenge,
        sourceLabel: "Longview educational methodology",
        asOf: research.asOf,
      },
    );
  }

  if (implied !== null) {
    items.push({
      id: "reverse-dcf",
      layer: "Deterministic calculation",
      tier: "Methodology",
      direction: implied > 0.2 ? "challenges" : "context",
      title: "Growth embedded in the reference price",
      detail: `Under the displayed cash-flow, discount-rate and terminal-growth assumptions, the reverse DCF solves to ${(implied * 100).toFixed(1)}% annual free-cash-flow growth during the forecast period.`,
      sourceLabel: "Longview reverse-DCF engine",
      asOf: research.asOf,
    });
  }

  if (risk) {
    items.push({
      id: "risk-history",
      layer: "Deterministic calculation",
      tier: research.mode === "sample" ? "Demonstration" : "Secondary",
      direction: "context",
      title: "Historical price behaviour",
      detail: `The available monthly series produced ${(risk.volatility * 100).toFixed(1)}% annualised volatility and a ${(risk.maxDrawdown * 100).toFixed(1)}% maximum observed drawdown. This describes the sample; it does not forecast future risk.`,
      sourceLabel: research.sources.find((source) => source.kind === "market")?.label ?? "Longview sample price series",
      asOf: research.asOf,
    });
  }

  if (!research.coverage.fundamentals) {
    items.push({
      id: "coverage-limit",
      layer: "Observed fact",
      tier: "Methodology",
      direction: "limitation",
      title: "Canonical fundamentals are unavailable",
      detail: "Longview will not invent missing company fundamentals. Business valuation methods remain disabled or illustrative until dated, attributable inputs are available.",
      sourceLabel: "Longview coverage policy",
      asOf: research.asOf,
    });
  }

  return items;
}

export function buildEducationalOpinion(
  research: SecurityResearch,
  assumptions: ValuationAssumptions,
  profile: HypothesisProfile,
): EducationalOpinion {
  const coverage = coverageLevel(research);
  const value = dcfPerShare(assumptions);
  const simulation = value === null ? null : monteCarloValuation(assumptions);
  const impliedGrowth = research.price ? reverseDcfGrowth(research.price, assumptions) : null;
  const context = sampleContext[research.identity.symbol];
  const modelRange = simulation ? {
    low: simulation.p10,
    midpoint: simulation.median,
    high: simulation.p90,
  } : null;

  let modelOpinion = "Available public information supports a descriptive learning exercise, but not a model-derived valuation opinion.";
  let status: EducationalOpinion["hypothesisStatus"] = profile.hypothesis.trim() ? "Presently unanswerable" : "Exploratory";

  if (modelRange && impliedGrowth !== null) {
    const demanding = impliedGrowth > 0.2;
    modelOpinion = demanding
      ? `The model describes a business with meaningful operating strengths, while the reference price also embeds demanding cash-flow growth under the stated assumptions. The educational conclusion is mixed rather than directional.`
      : `The reference price embeds moderate cash-flow growth under the stated assumptions, but the wide model range shows that small changes in growth and discount rates materially affect the result.`;
    status = demanding ? "Mixed evidence" : "Partially supported";
  } else if (research.identity.symbol === "D05.SI") {
    modelOpinion = "The most important educational conclusion is methodological: a bank should not be forced through an industrial-company free-cash-flow model.";
    status = "Presently unanswerable";
  }

  return {
    title: `${research.identity.name} through a quant lens`,
    dek: "An independent educational opinion that separates observed facts, deterministic calculations and model interpretation.",
    coverage,
    hypothesisStatus: status,
    modelRange,
    impliedGrowth,
    thesis: context?.support ?? "The available price record provides a starting point for studying historical behaviour and market expectations.",
    counterThesis: context?.challenge ?? "Price history alone cannot establish business quality or a defensible valuation range.",
    modelOpinion,
    variablesToMonitor: context?.monitor ?? ["Primary company disclosures", "Cash-flow evidence", "Sector conditions", "Data coverage"],
    unresolvedQuestions: context?.questions ?? ["Are canonical fundamentals available?", "Which valuation method fits this business?", "What evidence could falsify the opening thesis?"],
    evidence: genericEvidence(research, assumptions),
  };
}

