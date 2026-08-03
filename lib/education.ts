import type {
  CoverageLevel,
  EducationalOpinion,
  EvidenceRecord,
  HypothesisProfile,
  NarrativeSignals,
  PublicArticle,
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

const themeRules: Array<{ theme: string; pattern: RegExp }> = [
  { theme: "Sector demand", pattern: /\b(demand|market|industry|sector|customer|launch|satellite|ai|cloud|energy)\b/i },
  { theme: "Capital & valuation", pattern: /\b(ipo|valuation|funding|capital|earnings|revenue|profit|cash|shares?|stock|price)\b/i },
  { theme: "Execution", pattern: /\b(product|delivery|contract|manufactur|production|service|growth|forecast|results)\b/i },
  { theme: "Policy & regulation", pattern: /\b(regulat|government|policy|antitrust|approval|ban|tariff|export|court)\b/i },
  { theme: "Competition", pattern: /\b(rival|compet|versus|challenge|threat|share loss)\b/i },
  { theme: "Attention & narrative", pattern: /\b(hype|viral|meme|buzz|popular|trend|famous|musk|reddit)\b/i },
];

const supportPattern = /\b(beats?|surge|wins?|growth|record|expands?|strong|raises?|success|profit|approval)\b/i;
const challengePattern = /\b(miss|falls?|drops?|delay|risk|loss|lawsuit|probe|cuts?|weak|concern|warning|failure)\b/i;
const stopWords = new Set(["about", "after", "again", "against", "could", "from", "have", "into", "more", "that", "their", "there", "these", "this", "with", "would"]);

export const defaultHypothesis: HypothesisProfile = {
  attention: "curious",
  understanding: "new",
  hypothesis: "",
};

export function coverageLevel(research: SecurityResearch): CoverageLevel {
  if (research.coverage.fundamentals && research.coverage.history) return "full";
  if (research.coverage.price || research.coverage.history || research.coverage.articles) return "partial";
  return "research-only";
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

export function articleTheme(title: string) {
  return themeRules.find((rule) => rule.pattern.test(title))?.theme ?? "General company news";
}

export function articleDirection(title: string): "supports" | "challenges" | "context" {
  const supports = supportPattern.test(title);
  const challenges = challengePattern.test(title);
  // Risk language takes precedence when a verb such as "raises" is itself
  // superficially positive ("raises execution risk").
  if (challenges) return "challenges";
  if (supports) return "supports";
  return "context";
}

export function analyzeNarrative(articles: PublicArticle[] = [], hypothesis = ""): NarrativeSignals {
  const counts = new Map<string, number>();
  let supports = 0;
  let challenges = 0;
  let context = 0;
  for (const article of articles) {
    const theme = articleTheme(article.title);
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
    const direction = articleDirection(article.title);
    if (direction === "supports") supports++;
    else if (direction === "challenges") challenges++;
    else context++;
  }
  const themes = [...counts.entries()].map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
  const total = articles.length;
  const probabilities = themes.map((item) => item.count / Math.max(1, total));
  const rawEntropy = probabilities.reduce((sum, probability) => sum - probability * Math.log2(probability), 0);
  const maxEntropy = themes.length > 1 ? Math.log2(themes.length) : 1;
  const hypothesisTerms = hypothesis.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((term) => !stopWords.has(term)) ?? [];
  const hypothesisMatches = hypothesisTerms.length
    ? articles.filter((article) => hypothesisTerms.some((term) => article.title.toLowerCase().includes(term))).length
    : 0;
  const now = Date.now();
  const recentCount = articles.filter((article) => {
    const timestamp = Date.parse(article.publishedAt);
    return Number.isFinite(timestamp) && now - timestamp <= 30 * 86400000;
  }).length;
  const publisherCount = new Set(articles.map((article) => article.publisher.toLowerCase())).size;
  return {
    articleCount: total,
    publisherCount,
    sourceDiversity: total ? publisherCount / total : 0,
    themeEntropy: themes.length ? rawEntropy / maxEntropy : 0,
    recentCount,
    dominantTheme: themes[0]?.theme ?? "No current theme",
    dominantShare: total ? (themes[0]?.count ?? 0) / total : 0,
    hypothesisMatches,
    supports,
    challenges,
    context,
    themes,
  };
}

function publicArticleEvidence(articles: PublicArticle[]): EvidenceRecord[] {
  return articles.slice(0, 8).map((article) => {
    const theme = articleTheme(article.title);
    const direction = articleDirection(article.title);
    return {
      id: `public-${article.id}`,
      layer: "Source interpretation",
      tier: "Secondary",
      direction,
      title: article.title,
      detail: `A current ${theme.toLowerCase()} headline from ${article.publisher}. Longview uses the headline to map the public narrative, not as proof that the underlying business claim is true. Open the source and inspect its evidence.`,
      sourceLabel: article.publisher,
      asOf: article.publishedAt,
      url: article.url,
      theme,
    };
  });
}

function genericEvidence(research: SecurityResearch, assumptions: ValuationAssumptions): EvidenceRecord[] {
  const periods = research.historyInterval === "daily" ? 252 : 12;
  const risk = riskMetrics(research.priceHistory, periods);
  const implied = research.price ? reverseDcfGrowth(research.price, assumptions) : null;
  const context = sampleContext[research.identity.symbol];
  const items: EvidenceRecord[] = [];

  if (research.coverage.identity && research.price !== null) {
    items.push({
      id: "listing-snapshot",
      layer: "Observed fact",
      tier: "Secondary",
      direction: "context",
      title: `${research.identity.symbol} resolves to ${research.identity.name}`,
      detail: `The public market-data record identifies an ${research.identity.type.toLowerCase()} on ${research.identity.exchange} with a reference price of ${research.identity.currency} ${research.price.toFixed(2)}. Identity and price do not establish business quality or value.`,
      sourceLabel: research.sources.find((source) => source.kind === "market")?.publisher ?? "Public market-data service",
      asOf: research.asOf,
      url: research.sources.find((source) => source.kind === "market")?.url,
    });
  }

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

  items.push(...publicArticleEvidence(research.articles ?? []));

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
  if (implied === null && assumptions.eps > 0) {
    const bankLike = /\b(bank|banking|financial institution)\b/i.test(`${research.identity.name} ${research.identity.type}`);
    const multiple = bankLike ? 12 : assumptions.targetPe;
    items.push({
      id: "earnings-scenario",
      layer: "Deterministic calculation",
      tier: "Methodology",
      direction: "context",
      title: "Earnings-multiple scenario selected",
      detail: `Reported EPS of ${assumptions.eps.toFixed(2)} and a transparent ${multiple.toFixed(1)}× base multiple produce a midpoint of ${research.identity.currency} ${(assumptions.eps * multiple).toFixed(2)}. This is a relative-value scenario, not intrinsic value or a recommended target.`,
      sourceLabel: "Longview model-selection engine",
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
      detail: `The available ${research.historyInterval ?? "monthly"} series produced ${(risk.volatility * 100).toFixed(1)}% annualised volatility and a ${(risk.maxDrawdown * 100).toFixed(1)}% maximum observed drawdown. A short listing history makes these estimates unstable.`,
      sourceLabel: research.sources.find((source) => source.kind === "market")?.label ?? "Longview sample price series",
      asOf: research.asOf,
      url: research.sources.find((source) => source.kind === "market")?.url,
    });
  }

  if (!research.coverage.fundamentals) {
    items.push({
      id: "coverage-limit",
      layer: "Observed fact",
      tier: "Methodology",
      direction: "limitation",
      title: "A financial valuation is not supportable yet",
      detail: "Longview found no model-ready reported free cash flow and earnings series for this listing. It will quantify public narrative and price behaviour, but it will not invent a DCF or recommended target.",
      sourceLabel: "Longview coverage policy",
      asOf: research.asOf,
    });
  }

  if (!items.length) {
    items.push({
      id: "unresolved-coverage",
      layer: "Observed fact",
      tier: "Methodology",
      direction: "limitation",
      title: "The requested company could not be resolved",
      detail: "No exact listing, price series or current public article sample was returned. Longview cannot make a company claim from an empty evidence set.",
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
  const narrative = analyzeNarrative(research.articles ?? [], profile.hypothesis);
  const bankLike = /\b(bank|banking|financial institution)\b/i.test(`${research.identity.name} ${research.identity.type}`);
  const earningsMultiple = bankLike ? 12 : assumptions.targetPe;
  const earningsMidpoint = value === null && assumptions.eps > 0 ? assumptions.eps * earningsMultiple : null;
  const earningsRange = earningsMidpoint === null ? null : {
    low: earningsMidpoint * 0.8,
    midpoint: earningsMidpoint,
    high: earningsMidpoint * 1.2,
  };
  const valuationMethod: EducationalOpinion["valuationMethod"] = simulation
    ? "Discounted cash flow"
    : earningsRange
      ? "Earnings-multiple scenario"
      : null;
  const modelRange = simulation ? { low: simulation.p10, midpoint: simulation.median, high: simulation.p90 } : earningsRange;

  let modelOpinion = "The available evidence is too thin to support either a financial valuation or a useful narrative assessment.";
  let status: EducationalOpinion["hypothesisStatus"] = profile.hypothesis.trim() ? "Presently unanswerable" : "Exploratory";
  let thesis = context?.support ?? "No supportable company thesis can be formed from the available evidence.";
  let counterThesis = context?.challenge ?? "An empty or single-source evidence set should not be converted into confidence.";
  let variablesToMonitor = context?.monitor ?? ["Primary company disclosures", "Reported cash-flow evidence", "Sector demand", "Data coverage"];
  let unresolvedQuestions = context?.questions ?? ["Can the exact listing be verified?", "Which valuation method fits this business?", "What evidence could falsify the opening thesis?"];

  if (valuationMethod === "Discounted cash flow" && modelRange && impliedGrowth !== null) {
    const demanding = impliedGrowth > 0.2;
    const pricePosture = research.price !== null && research.price > modelRange.high
      ? "above"
      : research.price !== null && research.price < modelRange.low
        ? "below"
        : "inside";
    modelOpinion = `Under the displayed assumptions, the reference price sits ${pricePosture} the model-derived range and reverse DCF implies ${(impliedGrowth * 100).toFixed(1)}% annual free-cash-flow growth. ${demanding ? "That is a demanding execution hurdle." : "That is a more moderate embedded expectation."} This is a conditional model comparison, not a transaction conclusion.`;
    status = demanding ? "Mixed evidence" : "Partially supported";
    if (!context && narrative.articleCount) {
      thesis = `${narrative.articleCount} current headlines from ${narrative.publisherCount} publishers provide a live context map, led by ${narrative.dominantTheme.toLowerCase()} (${Math.round(narrative.dominantShare * 100)}% of the sample). The financial model separately tests whether current price expectations look demanding under stated cash-flow assumptions.`;
      const challenging = (research.articles ?? []).find((article) => articleDirection(article.title) === "challenges");
      counterThesis = challenging
        ? `The public sample contains an explicit counter-signal—“${challenging.title}” (${challenging.publisher})—while the model remains highly sensitive to discount rate, growth and starting cash flow.`
        : "The sampled headlines contain little explicit counter-evidence, but that may reflect source selection. The model range itself remains wide and assumption-sensitive.";
      variablesToMonitor = [...new Set([
        ...narrative.themes.slice(0, 3).map((item) => item.theme),
        "Free cash flow per share",
        "Operating margin and return on capital",
        "Model-implied growth versus reported growth",
      ])];
      unresolvedQuestions = [
        "Do the linked articles trace their claims to issuer filings or primary data?",
        "How durable are the cash flows used as the model starting point?",
        "Which discount rate and comparison multiple best fit the company’s risk and growth?",
      ];
    }
  } else if (valuationMethod === "Earnings-multiple scenario" && modelRange) {
    const pricePosture = research.price !== null && research.price > modelRange.high
      ? "above"
      : research.price !== null && research.price < modelRange.low
        ? "below"
        : "inside";
    modelOpinion = `${bankLike ? "Because industrial free cash flow is unsuitable for this bank, Longview selected an earnings-multiple scenario instead." : "Reported earnings support an earnings-multiple scenario even though a cash-flow DCF is unavailable."} The reference price sits ${pricePosture} a ${earningsMultiple.toFixed(1)}× base-P/E range of ${research.identity.currency} ${modelRange.low.toFixed(2)}–${modelRange.high.toFixed(2)}. This is a conditional comparison; book value, sustainable return on equity and credit quality still require primary-source review.`;
    status = pricePosture === "inside" ? "Partially supported" : "Mixed evidence";
  } else if (narrative.articleCount) {
    thesis = `${narrative.articleCount} recent public headlines from ${narrative.publisherCount} publishers provide a live macro lens. Coverage is most concentrated in ${narrative.dominantTheme.toLowerCase()} (${Math.round(narrative.dominantShare * 100)}% of the sample).`;
    const challenging = (research.articles ?? []).find((article) => articleDirection(article.title) === "challenges");
    counterThesis = challenging
      ? `The sampled coverage also includes a counter-signal: “${challenging.title}” (${challenging.publisher}). A headline is a lead to investigate, not a verified financial fact.`
      : "The headline sample contains little explicit counter-evidence. That absence may reflect source selection or recency rather than a genuinely low-risk business.";
    modelOpinion = research.coverage.price
      ? `This is presently a narrative-and-market-behaviour lesson, not a financial valuation. Public attention is measurable across ${narrative.publisherCount} publishers, and the available price series can describe realised volatility, but reported model-ready cash flows are missing. Longview therefore withholds a valuation range.`
      : `This is presently a public-narrative lesson. Longview found ${narrative.articleCount} current headlines but no verified listed security or model-ready financial record, so it withholds stock-level valuation conclusions.`;
    status = profile.hypothesis.trim()
      ? narrative.hypothesisMatches > 0 || narrative.supports || narrative.challenges ? "Mixed evidence" : "Presently unanswerable"
      : "Exploratory";
    variablesToMonitor = [...new Set([
      ...narrative.themes.slice(0, 3).map((item) => item.theme),
      "Issuer filings and reported cash flow",
      "Source diversity and narrative changes",
    ])];
    unresolvedQuestions = [
      "Do the underlying articles cite primary evidence or repeat the same narrative?",
      "Which current themes can be linked to revenue, margins or capital needs?",
      "When will model-ready reported financial history become available?",
    ];
  }

  return {
    title: `${research.identity.name} through a quant lens`,
    dek: valuationMethod === "Discounted cash flow"
      ? `An independent educational opinion combining ${narrative.articleCount} current public headlines, market history and deterministic cash-flow, relative-value and risk models.`
      : valuationMethod === "Earnings-multiple scenario"
        ? `An independent educational opinion combining available public evidence, market history and an earnings-multiple scenario selected from the extracted data.`
      : narrative.articleCount
      ? `An independent educational opinion built from ${narrative.articleCount} current public headlines, available market history and explicitly withheld financial valuation.`
      : "An independent educational opinion that separates observed facts, deterministic calculations and model interpretation.",
    coverage,
    hypothesisStatus: status,
    valuationMethod,
    modelRange,
    impliedGrowth,
    thesis,
    counterThesis,
    modelOpinion,
    variablesToMonitor,
    unresolvedQuestions,
    evidence: genericEvidence(research, assumptions),
    narrative,
  };
}
