"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Binary,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Database,
  ExternalLink,
  FlaskConical,
  Gauge,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Newspaper,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { SecuritySearch } from "@/components/security-search";
import type {
  EducationalOpinion,
  HypothesisProfile,
  NarrativeSignals,
  PublicArticle,
  SecurityResearch,
  TutorResponse,
  ValuationAssumptions,
} from "@/lib/domain";
import {
  buildEducationalOpinion,
  analyzeNarrative,
  articleTheme,
  containsAdviceRequest,
  defaultHypothesis,
  learningPrompt,
} from "@/lib/education";
import {
  dcfPerShare,
  factorLens,
  garch11,
  historicalTailRisk,
  monteCarloMarketRisk,
  monteCarloValuation,
  relativeValue,
  reverseDcfGrowth,
  riskMetrics,
} from "@/lib/quant";

const fallbackAssumptions: ValuationAssumptions = {
  fcfPerShare: 0,
  forecastYears: 5,
  growthRate: 0.12,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  netDebtPerShare: 0,
  eps: 0,
  targetPe: 25,
};

const stages = [
  { short: "Starting point", label: "Your starting point" },
  { short: "Roadmap", label: "Automatic learning roadmap" },
  { short: "Evidence", label: "Evidence desk" },
  { short: "Quant", label: "Automatic quant lab" },
  { short: "Opinion", label: "Educational opinion" },
  { short: "Debrief", label: "Education debrief" },
];

const attentionOptions: Array<{ value: HypothesisProfile["attention"]; label: string }> = [
  { value: "product", label: "The company or its products" },
  { value: "news", label: "Recent news or a narrative" },
  { value: "price", label: "A large price move" },
  { value: "mentioned", label: "Someone mentioned it" },
  { value: "curious", label: "General curiosity" },
  { value: "unsure", label: "I am not sure yet" },
];

const knowledgeOptions: Array<{ value: HypothesisProfile["understanding"]; label: string; detail: string }> = [
  { value: "new", label: "New to this", detail: "Start with first principles" },
  { value: "some", label: "Some familiarity", detail: "Explain the institutional logic" },
  { value: "comfortable", label: "Comfortable", detail: "Emphasise model limits and counterarguments" },
];

type QuizItem = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

type AnalysisSummary = {
  posture: string;
  postureDetail: string;
  researchFinding: string;
  quantFinding: string;
  combinedFinding: string;
  evidenceBalance: string;
  macroAnalysis: string;
  companyAnalysis: string;
  financialTransmission: string;
  companyHeadlines: string[];
  sectorSummary: string;
  sectorMeaning: string;
  sectorSignals: Array<{ theme: string; share: string; headlines: string[]; meaning: string }>;
  methods: Array<{
    name: string;
    strategy: string;
    question: string;
    result: string;
    interpretation: string;
    limitation: string;
  }>;
};

type HeadlineSignal = "innovation" | "demand" | "cost" | "valuation" | "competition" | "policy";

const headlineSignalPatterns: Record<HeadlineSignal, RegExp> = {
  innovation: /\b(ai|artificial intelligence|launch|release|product|platform|breakthrough|technology|chip|cloud|hardware|software)\b/i,
  demand: /\b(demand|orders?|sales|growth|adoption|customers?|backlog|market share|expansion)\b/i,
  cost: /\b(costs?|margin|pricing|prices?|tariffs?|shortage|supply|spending|capex|expense)\b/i,
  valuation: /\b(valuation|valuations|earnings|stock|shares?|market cap|cautious|bubble|surging|rally|down)\b/i,
  competition: /\b(competition|competitor|rival|versus|vs\.?|shakeout|loses? share)\b/i,
  policy: /\b(regulation|regulatory|policy|government|approval|antitrust|ban|export controls?)\b/i,
};

function detectedHeadlineSignals(titles: string[]) {
  return (Object.entries(headlineSignalPatterns) as Array<[HeadlineSignal, RegExp]>)
    .filter(([, pattern]) => titles.some((title) => pattern.test(title)))
    .map(([signal]) => signal);
}

function joinQuoted(titles: string[]) {
  if (!titles.length) return "";
  const shortened = titles.map((title) => `“${title.length > 105 ? `${title.slice(0, 102)}…` : title}”`);
  return shortened.length === 1 ? shortened[0] : `${shortened.slice(0, -1).join(", ")} and ${shortened.at(-1)}`;
}

function money(research: SecurityResearch, value: number | null) {
  if (value === null || !Number.isFinite(value)) return "unavailable";
  const currency = research.identity.currency === "—" ? "" : `${research.identity.currency} `;
  return `${currency}${value.toFixed(value >= 100 ? 0 : 2)}`;
}

function buildAnalysisSummary(
  research: SecurityResearch,
  opinion: EducationalOpinion,
  valuation: number | null,
  relative: number | null,
  reverseGrowth: number | null,
  risk: ReturnType<typeof riskMetrics>,
  garch: ReturnType<typeof garch11>,
  tailRisk: ReturnType<typeof historicalTailRisk>,
  marketRisk: ReturnType<typeof monteCarloMarketRisk>,
  narrative: NarrativeSignals,
): AnalysisSummary {
  const range = opinion.modelRange;
  const price = research.price;
  let posture = "VALUATION NOT ASSESSABLE";
  let postureDetail = "Reported inputs are insufficient for a financial value comparison. This is a coverage conclusion, not a negative view of the company.";

  if (range && price !== null) {
    const gap = price / range.midpoint - 1;
    if (price > range.high) posture = "PRICE ABOVE MODEL RANGE";
    else if (price < range.low) posture = "PRICE BELOW MODEL RANGE";
    else posture = "PRICE INSIDE MODEL RANGE";
    postureDetail = `The reference price is ${Math.abs(gap * 100).toFixed(1)}% ${gap >= 0 ? "above" : "below"} the model midpoint of ${money(research, range.midpoint)} under the displayed assumptions. This is a model comparison—not a buy, sell or hold conclusion.`;
  }

  const articles = research.articles ?? [];
  const identityTokens = [research.identity.symbol, ...research.identity.name.split(/\s+/).filter((token) => token.length > 4)]
    .map((token) => token.toLowerCase());
  const companyArticles = articles
    .map((article, index) => {
      const title = article.title.toLowerCase();
      const nameMatches = identityTokens.slice(1).filter((token) => title.includes(token)).length;
      const symbolMatch = title.includes(research.identity.symbol.toLowerCase()) ? 1 : 0;
      const relatedMatch = article.relatedTickers.some((ticker) => ticker.toUpperCase() === research.identity.symbol.toUpperCase()) ? 1 : 0;
      const basketPenalty = article.relatedTickers.length > 3 ? 1 : 0;
      return { article, index, relevance: nameMatches * 3 + symbolMatch * 2 + relatedMatch - basketPenalty };
    })
    .filter(({ relevance }) => relevance > 0)
    .sort((left, right) => right.relevance - left.relevance || left.index - right.index)
    .map(({ article }) => article);
  const companyHeadlines = companyArticles.slice(0, 3).map((article) => article.title);
  const macroHeadlines = articles
    .filter((article) => !companyArticles.includes(article))
    .slice(0, 4)
    .map((article) => article.title);
  const allSignals = detectedHeadlineSignals(articles.map((article) => article.title));
  const companySignals = detectedHeadlineSignals(companyHeadlines);
  const hasConstructiveSignal = articles.some((article) => /\b(growth|demand|breakthrough|ready|launch|surge|expansion|record|beat)\b/i.test(article.title));
  const hasPressureSignal = articles.some((article) => /\b(cautious|cost|down|risk|bubble|tariff|shortage|shakeout|miss|decline)\b/i.test(article.title));
  const evidenceBalance = !narrative.articleCount
    ? "INSUFFICIENT PUBLIC COVERAGE"
    : hasConstructiveSignal && hasPressureSignal
      ? "MIXED: OPPORTUNITY AND EXECUTION PRESSURE"
      : hasConstructiveSignal
        ? "CONSTRUCTIVE NARRATIVE, PENDING PRIMARY VERIFICATION"
        : hasPressureSignal
          ? "PRESSURE-LED NARRATIVE, PENDING PRIMARY VERIFICATION"
          : "CONTEXTUAL COVERAGE WITHOUT A CLEAR DIRECTION";
  const signalLanguage: Record<HeadlineSignal, string> = {
    innovation: "a fast product and technology cycle",
    demand: "changing customer demand",
    cost: "cost and margin pressure",
    valuation: "a demanding expectations and valuation debate",
    competition: "competitive repositioning",
    policy: "policy and regulatory uncertainty",
  };
  const macroForces = allSignals.map((signal) => signalLanguage[signal]).slice(0, 4);
  const macroAnalysis = narrative.articleCount
    ? `Across ${narrative.articleCount} sampled headlines, the market backdrop is being shaped by ${macroForces.length ? macroForces.join(", ") : narrative.dominantTheme.toLowerCase()}. ${macroHeadlines.length ? `Broader items such as ${joinQuoted(macroHeadlines.slice(0, 2))} show the environment in which the company is being judged.` : "Most of the usable coverage is company-specific rather than sector-wide."} This can change the growth, margin and risk assumptions investors apply, but it is not evidence that those outcomes have occurred.`
    : "The scan did not return enough current coverage to form a market or sector view.";
  const companyDrivers = companySignals.map((signal) => signalLanguage[signal]).slice(0, 4);
  const companyAnalysis = companyHeadlines.length
    ? `At the company level, the most relevant sampled developments are ${joinQuoted(companyHeadlines)}. Read together, they point to ${companyDrivers.length ? companyDrivers.join(", ") : "a developing company narrative"}. The evidence balance is therefore ${evidenceBalance.toLowerCase()}: the headlines identify possible operating drivers and risks, but the claims still require confirmation in company disclosures and reported results.`
    : `No headline in the current sample was specific enough to ${research.identity.name} to support a company-level conclusion. Longview therefore keeps the broader market context separate from company evidence.`;
  const financialChannels = [
    companySignals.includes("innovation") || companySignals.includes("demand") ? "product adoption and demand → revenue growth" : null,
    companySignals.includes("cost") ? "pricing and input costs → gross margin and free cash flow" : null,
    companySignals.includes("competition") ? "competitive intensity → market share and reinvestment needs" : null,
    companySignals.includes("policy") ? "policy changes → accessible demand, costs or timing" : null,
    companySignals.includes("valuation") || allSignals.includes("valuation") ? "expectations and valuation → the growth burden embedded in price" : null,
  ].filter((channel): channel is string => Boolean(channel));
  const financialTransmission = financialChannels.length
    ? `The finance chain to test is: ${financialChannels.join("; ")}. A headline matters to the model only when a later filing or result changes one of those business variables. Until then it is a hypothesis, not a valuation input.`
    : "The sampled headlines do not yet map cleanly to revenue, margins, cash flow, capital needs or risk. They should generate follow-up questions rather than change the valuation model.";
  const researchFinding = narrative.articleCount
    ? `${macroAnalysis} ${companyAnalysis}`
    : "The public scan returned too little current coverage to support a narrative conclusion. Absence of headlines is not evidence that the company is low-risk or unimportant.";

  const valuationFinding = opinion.valuationMethod === "Discounted cash flow" && valuation !== null && range
    ? `A five-year free-cash-flow DCF produces ${money(research, valuation)}, while seeded sensitivity produces a ${money(research, range.low)}–${money(research, range.high)} range. Reverse DCF estimates that the current price requires ${reverseGrowth === null ? "an unresolved" : `${(reverseGrowth * 100).toFixed(1)}% annual`} free-cash-flow growth under the displayed discount and terminal-growth assumptions.`
    : opinion.valuationMethod === "Earnings-multiple scenario" && range
      ? `The extracted earnings data could not support an industrial-company DCF, so Longview selected an earnings-multiple scenario. The resulting range is ${money(research, range.low)}–${money(research, range.high)}, with a midpoint of ${money(research, range.midpoint)}. This answers how price compares under a stated earnings multiple; it does not establish intrinsic value.`
    : opinion.valuationMethod === "Revenue-multiple scenario" && range
      ? `Positive cash flow and earnings were unavailable, so Longview selected a revenue-multiple scenario instead of forcing a DCF. The resulting range is ${money(research, range.low)}–${money(research, range.high)}, with a midpoint of ${money(research, range.midpoint)}. This is a relative cross-check for a growth company; future margins, capital needs and dilution remain outside the simple model.`
    : risk
      ? `No defensible financial valuation could be run. The supported market-behaviour model uses ${research.priceHistory.length} ${research.historyInterval ?? "monthly"} observations and measures ${(risk.volatility * 100).toFixed(1)}% annualised volatility with a ${(risk.maxDrawdown * 100).toFixed(1)}% maximum observed drawdown. These are historical descriptors, not fair value.`
      : "Neither model-ready fundamentals nor enough price history were available. Longview limits the quantitative conclusion to coverage and narrative measurements.";
  const riskFinding = garch && tailRisk && marketRisk
    ? ` Separately, GARCH(1,1) estimates ${(garch.currentVolatility * 100).toFixed(1)}% current annualised conditional volatility with ${garch.persistence.toFixed(2)} persistence. Historical 95% one-period VaR is ${(tailRisk.var95 * 100).toFixed(1)}%, while a seeded ${marketRisk.horizonPeriods}-period market-risk simulation estimates ${(marketRisk.var95 * 100).toFixed(1)}% VaR at 95%. These are loss-distribution estimates, not price targets.`
    : tailRisk && marketRisk
      ? ` Separately, historical 95% one-period VaR is ${(tailRisk.var95 * 100).toFixed(1)}%, while a seeded ${marketRisk.horizonPeriods}-period market-risk simulation estimates ${(marketRisk.var95 * 100).toFixed(1)}% VaR at 95%. The history is not deep enough for the app's GARCH fit.`
      : "";
  const quantFinding = `${valuationFinding}${riskFinding}`;

  const combinedFinding = range
    ? `${evidenceBalance}. ${posture}. The public evidence identifies the operating forces that could change revenue, margins, cash flow and risk; the quantitative model shows how demanding the current price is under today’s inputs. The evidence does not override the model, and the model does not verify the headlines.`
    : `${evidenceBalance}. ${posture}. The coverage can identify possible business drivers and observed market risk, but missing financial inputs prevent an honest overvaluation or undervaluation conclusion.`;

  const themeMeanings: Record<string, string> = {
    "Sector demand": "Demand headlines can indicate a changing addressable market, but they matter financially only if they translate into company revenue, pricing or backlog.",
    "Capital & valuation": "Capital and valuation coverage shows how expectations are being framed. It can raise the burden of proof without establishing fair value.",
    "Execution": "Execution coverage points to delivery, production or contract milestones that may affect revenue timing, margins and cash conversion.",
    "Policy & regulation": "Policy coverage can change accessible demand, costs, approvals or competitive conditions and should be traced to official decisions.",
    "Competition": "Competition coverage matters when it changes market share, pricing power, customer concentration or investment requirements.",
    "Attention & narrative": "Attention can amplify price volatility and expectations, but popularity is not operating evidence.",
    "General company news": "General coverage provides context but must be decomposed into testable effects on demand, margins, capital or risk.",
  };
  const sectorSignals = narrative.themes.slice(0, 3).map((theme) => ({
    theme: theme.theme,
    share: `${Math.round(theme.count / Math.max(1, narrative.articleCount) * 100)}%`,
    headlines: (research.articles ?? [])
      .filter((article) => articleTheme(article.title) === theme.theme)
      .slice(0, 2)
      .map((article) => article.title),
    meaning: themeMeanings[theme.theme] ?? themeMeanings["General company news"],
  }));
  const sectorSummary = sectorSignals.length
    ? `${evidenceBalance}. The sampled conversation is led by ${sectorSignals.map((signal) => `${signal.theme.toLowerCase()} (${signal.share})`).join(", ")} across ${narrative.publisherCount} publishers.`
    : "The scan did not return enough current coverage to summarise a sector narrative.";
  const sectorMeaning = financialTransmission;

  const methods: AnalysisSummary["methods"] = opinion.valuationMethod === "Discounted cash flow" && valuation !== null && range ? [
    {
      name: "Reverse DCF",
      strategy: "Expectations investing",
      question: "What cash-flow growth is embedded in today’s price?",
      result: reverseGrowth === null ? "No stable solution" : `${(reverseGrowth * 100).toFixed(1)}% annual FCF growth`,
      interpretation: "Higher implied growth means the market price requires more future execution under these assumptions.",
      limitation: "Highly sensitive to starting cash flow, discount rate and terminal growth.",
    },
    {
      name: "Scenario DCF",
      strategy: "Intrinsic-value sensitivity",
      question: "What is the present value of modelled future free cash flow?",
      result: money(research, valuation),
      interpretation: price === null ? "No price comparison is available." : postureDetail,
      limitation: "A DCF is a conditional calculation, not an observed fact or forecast guarantee.",
    },
    {
      name: "Seeded Monte Carlo",
      strategy: "Probabilistic sensitivity analysis",
      question: "How widely does value move when assumptions vary together?",
      result: `${money(research, range.low)}–${money(research, range.high)} (P10–P90)`,
      interpretation: "The width of the range shows model uncertainty and assumption sensitivity.",
      limitation: "The distribution reflects chosen input ranges, not real-world forecast probabilities.",
    },
    {
      name: "P/E cross-check",
      strategy: "Relative valuation",
      question: "What value follows from earnings and a comparison multiple?",
      result: money(research, relative),
      interpretation: "This checks whether an earnings-based lens broadly agrees with the cash-flow model.",
      limitation: "The selected multiple may not match the company’s growth, quality or cycle.",
    },
    {
      name: "Factor and risk lens",
      strategy: "Systematic characteristics",
      question: "What historical traits describe the security?",
      result: risk ? `${(risk.volatility * 100).toFixed(1)}% volatility · ${(risk.maxDrawdown * 100).toFixed(1)}% max drawdown` : "Not enough history",
      interpretation: "Momentum, quality, value and volatility are descriptors used to compare characteristics.",
      limitation: "Transparent proxies are not a full factor regression or trading signal.",
    },
  ] : opinion.valuationMethod === "Earnings-multiple scenario" && range ? [
    {
      name: "Earnings-multiple scenario",
      strategy: "Relative valuation",
      question: "What price range follows from reported earnings and a stated comparison multiple?",
      result: `${money(research, range.low)}–${money(research, range.high)}`,
      interpretation: postureDetail,
      limitation: "The multiple must be tested against growth, capital needs, cyclicality and suitable peers.",
    },
    {
      name: "Reverse P/E",
      strategy: "Expectations mapping",
      question: "What earnings multiple is embedded in the current market price?",
      result: research.price !== null && research.fundamentals.eps ? `${(research.price / research.fundamentals.eps).toFixed(1)}× current P/E` : "Unavailable",
      interpretation: "The embedded multiple shows how much investors currently pay for each unit of reported earnings.",
      limitation: "P/E ignores balance-sheet quality and can mislead when earnings are cyclical or unusually high or low.",
    },
    {
      name: "Historical risk",
      strategy: "Market-behaviour statistics",
      question: "How has the available price series behaved?",
      result: risk ? `${(risk.volatility * 100).toFixed(1)}% volatility · ${(risk.maxDrawdown * 100).toFixed(1)}% max drawdown` : "Not enough history",
      interpretation: "The statistics describe realised variation and loss from a prior peak.",
      limitation: "Historical risk is not a fair-value model or future-return forecast.",
    },
    {
      name: "Model eligibility",
      strategy: "Quantitative model governance",
      question: "Why was this model selected instead of DCF?",
      result: "Earnings available · industrial FCF unsuitable or unavailable",
      interpretation: "The model selector uses the evidence that exists and avoids forcing an incompatible cash-flow definition.",
      limitation: "A fuller bank analysis should add book value, sustainable ROE, capital and credit-loss scenarios.",
    },
  ] : opinion.valuationMethod === "Revenue-multiple scenario" && range ? [
    {
      name: "Revenue-multiple scenario",
      strategy: "Relative valuation for pre-profit growth",
      question: "What equity-value range follows from revenue per share and an explicit EV-to-sales multiple?",
      result: `${money(research, range.low)}–${money(research, range.high)}`,
      interpretation: postureDetail,
      limitation: "Sales multiples do not capture future margins, reinvestment, dilution or whether the comparison set is defensible.",
    },
    {
      name: "Reverse price-to-sales",
      strategy: "Expectations mapping",
      question: "How much does the market currently pay for each unit of reported revenue?",
      result: research.price !== null && research.fundamentals.revenuePerShare
        ? `${(research.price / research.fundamentals.revenuePerShare).toFixed(1)}× current price-to-sales`
        : "Unavailable",
      interpretation: "A higher multiple raises the burden on future growth and margins, but it is not automatically evidence of overvaluation.",
      limitation: "Price-to-sales ignores profitability, debt, capital intensity and share dilution.",
    },
    {
      name: "Historical risk",
      strategy: "Market-behaviour statistics",
      question: "How has the available price series behaved?",
      result: risk ? `${(risk.volatility * 100).toFixed(1)}% volatility · ${(risk.maxDrawdown * 100).toFixed(1)}% max drawdown` : "Not enough history",
      interpretation: "The statistics describe realised variation and loss from a prior peak.",
      limitation: "Historical risk is not a valuation model or future-return forecast.",
    },
    {
      name: "Model eligibility",
      strategy: "Quantitative model governance",
      question: "Why was revenue valuation selected instead of DCF?",
      result: "Revenue per share available · positive FCF and EPS unavailable",
      interpretation: "The selector uses a smaller relative method that matches the available data.",
      limitation: "The scenario should be reconciled to filings and a carefully selected peer set.",
    },
  ] : [
    {
      name: "Public coverage map",
      strategy: "Narrative research",
      question: "Which topics and publishers shape the current public conversation?",
      result: `${narrative.articleCount} headlines · ${narrative.publisherCount} publishers`,
      interpretation: `The dominant sampled theme is ${narrative.dominantTheme.toLowerCase()}.`,
      limitation: "Headline metadata is a research lead, not verified company evidence.",
    },
    {
      name: "Shannon theme entropy",
      strategy: "Information concentration",
      question: "Is attention concentrated in one theme or spread across several?",
      result: narrative.articleCount ? `${narrative.themeEntropy.toFixed(2)} on a 0–1 scale` : "No usable sample",
      interpretation: "Values nearer 1 indicate a more evenly distributed topic mix.",
      limitation: "Entropy measures distribution—not truth, sentiment quality or future return.",
    },
    {
      name: "Historical risk",
      strategy: "Market-behaviour statistics",
      question: "How has the available price series behaved?",
      result: risk ? `${(risk.volatility * 100).toFixed(1)}% volatility · ${(risk.maxDrawdown * 100).toFixed(1)}% max drawdown` : "Not enough history",
      interpretation: "Volatility and drawdown quantify realised variation and loss from a prior peak.",
      limitation: "A short or unusual listing history is unstable and does not establish fair value.",
    },
    {
      name: "Model eligibility test",
      strategy: "Quantitative model governance",
      question: "Do the available inputs justify a financial valuation?",
      result: "DCF withheld",
      interpretation: "Missing cash flow or earnings prevents an honest over/undervaluation conclusion.",
      limitation: "Withholding is deliberately conservative; it is not a view on company quality.",
    },
  ];
  if (garch) methods.push({
    name: "GARCH(1,1)",
    strategy: "Conditional-volatility modelling",
    question: "Does recent volatility update the estimate of near-term market variability?",
    result: `${(garch.currentVolatility * 100).toFixed(1)}% current annualised volatility · ${garch.persistence.toFixed(2)} persistence`,
    interpretation: "Persistence near one means volatility shocks tend to decay slowly rather than disappear immediately.",
    limitation: "A simple Gaussian GARCH fit can understate jumps, asymmetry and very heavy tails.",
  });
  if (tailRisk) methods.push({
    name: "Historical VaR + expected shortfall",
    strategy: "Empirical tail-risk measurement",
    question: "How severe were the poorer returns in the observed sample?",
    result: `${(tailRisk.var95 * 100).toFixed(1)}% 95% VaR · ${(tailRisk.expectedShortfall95 * 100).toFixed(1)}% expected shortfall`,
    interpretation: "VaR marks a historical loss threshold; expected shortfall averages observations beyond that threshold.",
    limitation: "The sample may omit a future crisis and does not provide a personal loss or suitability assessment.",
  });
  if (marketRisk) methods.push({
    name: "Market-risk Monte Carlo",
    strategy: "Stochastic return simulation",
    question: `What loss distribution follows from the observed return and volatility process over ${marketRisk.horizonPeriods} periods?`,
    result: `${(marketRisk.var95 * 100).toFixed(1)}% 95% VaR · ${(marketRisk.var99 * 100).toFixed(1)}% 99% VaR`,
    interpretation: "This stress-tests market-price uncertainty; it is distinct from the DCF assumption simulation.",
    limitation: "The result inherits its distribution and volatility assumptions and is not a forecast probability.",
  });

  return {
    posture,
    postureDetail,
    researchFinding,
    quantFinding,
    combinedFinding,
    evidenceBalance,
    macroAnalysis,
    companyAnalysis,
    financialTransmission,
    companyHeadlines,
    sectorSummary,
    sectorMeaning,
    sectorSignals,
    methods,
  };
}

function buildContextualQuiz(
  research: SecurityResearch,
  analysis: AnalysisSummary,
  reverseGrowth: number | null,
  risk: ReturnType<typeof riskMetrics>,
  narrative: NarrativeSignals,
): QuizItem[] {
  if (research.identity.symbol === "D05.SI") {
    return [
      {
        question: "Why does Longview withhold its standard industrial-company DCF for DBS?",
        options: ["Bank deposits, capital and credit losses require a different valuation structure", "The share price is too high", "Banks cannot be analysed quantitatively"],
        correct: 0,
        explanation: "For a bank, deposits and regulatory capital are operating inputs. Industrial free-cash-flow definitions can therefore mislead.",
      },
      {
        question: "Which methods would be more suitable follow-up work for a bank?",
        options: ["Residual income and price-to-book tested against sustainable ROE", "Satellite-launch statistics", "A candlestick pattern alone"],
        correct: 0,
        explanation: "Residual-income and book-value methods connect bank value to capital, returns on equity and credit assumptions.",
      },
      {
        question: "What does the available price-history model contribute?",
        options: [
          risk ? `${(risk.volatility * 100).toFixed(1)}% volatility and ${(risk.maxDrawdown * 100).toFixed(1)}% maximum drawdown` : "Not enough observations",
          "A guaranteed return forecast",
          "A suitability assessment",
        ],
        correct: 0,
        explanation: "Historical risk describes observed price behaviour; it does not replace a bank-appropriate valuation.",
      },
    ];
  }

  if (research.coverage.fundamentals && reverseGrowth !== null) {
    return [
      {
        question: `What does ${research.identity.name}’s reverse DCF currently estimate?`,
        options: [`${(reverseGrowth * 100).toFixed(1)}% annual FCF growth is implied`, "A guaranteed future return", "The analyst-consensus target price"],
        correct: 0,
        explanation: `The calculation works backwards from ${research.identity.symbol}’s price and the displayed assumptions; it does not predict the future.`,
      },
      {
        question: `How does ${research.identity.symbol}’s price compare with Longview’s model range?`,
        options: [analysis.posture, "The evidence proves the stock should be bought", "Secondary headlines determine fair value"],
        correct: 0,
        explanation: analysis.postureDetail,
      },
      {
        question: "What did the historical risk model actually measure?",
        options: [
          risk ? `${(risk.volatility * 100).toFixed(1)}% annualised volatility and ${(risk.maxDrawdown * 100).toFixed(1)}% maximum drawdown` : "Not enough price history",
          "The probability of a profitable investment",
          "The company’s competitive moat",
        ],
        correct: 0,
        explanation: "Risk statistics summarise the observed price series. They do not forecast return or assess suitability.",
      },
    ];
  }

  if (!narrative.articleCount) {
    return [
      {
        question: `What does an empty current headline sample for ${research.identity.name} establish?`,
        options: ["Only that this scan returned no usable current coverage", "That the company has no risks", "That the security is undervalued"],
        correct: 0,
        explanation: "Missing secondary coverage is a data limitation, not evidence about quality, risk or value.",
      },
      {
        question: "Which quantitative conclusion remains valid without model-ready fundamentals?",
        options: ["Only supported historical price-behaviour statistics", "A fabricated DCF target", "A guaranteed directional forecast"],
        correct: 0,
        explanation: "Longview can calculate from observed price history, but it cannot turn that history into intrinsic value.",
      },
      {
        question: `Why is ${research.identity.symbol} labelled “valuation not assessable”?`,
        options: ["Suitable reported valuation inputs are unavailable", "The company is automatically unattractive", "The price must fall"],
        correct: 0,
        explanation: "The label describes model eligibility, not a directional view.",
      },
    ];
  }

  return [
    {
      question: `What dominated the sampled public coverage of ${research.identity.name}?`,
      options: [narrative.dominantTheme, "A verified intrinsic value", "The learner’s personal risk tolerance"],
      correct: 0,
      explanation: `${narrative.dominantTheme} represented ${Math.round(narrative.dominantShare * 100)}% of ${narrative.articleCount} sampled headlines.`,
    },
    {
      question: `What does the ${narrative.themeEntropy.toFixed(2)} theme-entropy reading mean?`,
      options: ["How dispersed the sampled topics are", "The probability of a price increase", "Whether the articles are true"],
      correct: 0,
      explanation: "Entropy measures the distribution of themes only. It is not sentiment, truth or valuation.",
    },
    {
      question: `Why is ${research.identity.symbol} labelled “valuation not assessable”?`,
      options: ["Model-ready reported inputs are missing", "The company is automatically unattractive", "Longview predicts the price will fall"],
      correct: 0,
      explanation: "Without suitable cash flow or earnings inputs, claiming overvaluation or undervaluation would fabricate precision.",
    },
  ];
}

export function ResearchWorkspace({ symbol }: { symbol: string }) {
  const [research, setResearch] = useState<SecurityResearch | null>(null);
  const [assumptions, setAssumptions] = useState(fallbackAssumptions);
  const [profile, setProfile] = useState<HypothesisProfile>(defaultHypothesis);
  const [activeStage, setActiveStage] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(0);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [opinionUnlocked, setOpinionUnlocked] = useState(false);
  const [tutor, setTutor] = useState<TutorResponse | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/securities?symbol=${encodeURIComponent(symbol)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "The security could not be loaded.");
        return body as SecurityResearch;
      })
      .then((body) => {
        if (!alive) return;
        setResearch(body);
        setAssumptions({
          fcfPerShare: body.fundamentals.fcfPerShare ?? 0,
          forecastYears: 5,
          growthRate: body.fundamentals.revenueGrowth ?? 0.12,
          discountRate: 0.1,
          terminalGrowth: 0.03,
          netDebtPerShare: body.fundamentals.netDebtPerShare ?? 0,
          eps: body.fundamentals.eps ?? 0,
          targetPe: body.fundamentals.peerPeMedian ?? 25,
        });
        try {
          const stored = window.localStorage.getItem(`longview-learning:${body.identity.symbol}`);
          if (stored) {
            const parsed = JSON.parse(stored) as {
              profile?: HypothesisProfile;
              activeStage?: number;
              completedThrough?: number;
              quiz?: Record<number, number>;
              opinionUnlocked?: boolean;
            };
            if (parsed.profile) setProfile(parsed.profile);
            setActiveStage(Math.min(5, Math.max(0, parsed.activeStage ?? 0)));
            setCompletedThrough(Math.min(5, Math.max(0, parsed.completedThrough ?? 0)));
            if (parsed.quiz) setQuiz(parsed.quiz);
            setOpinionUnlocked(Boolean(parsed.opinionUnlocked));
          }
        } catch {
          // A damaged local session should never block the learning experience.
        }
        setSessionReady(true);
      })
      .catch((caught) => alive && setError(caught instanceof Error ? caught.message : "The security could not be loaded."));
    return () => { alive = false; };
  }, [symbol]);

  useEffect(() => {
    if (!research || !sessionReady) return;
    window.localStorage.setItem(`longview-learning:${research.identity.symbol}`, JSON.stringify({
      profile,
      activeStage,
      completedThrough,
      quiz,
      opinionUnlocked,
    }));
  }, [research, sessionReady, profile, activeStage, completedThrough, quiz, opinionUnlocked]);

  const valuation = useMemo(() => dcfPerShare(assumptions), [assumptions]);
  const reverseGrowth = useMemo(
    () => research?.price ? reverseDcfGrowth(research.price, assumptions) : null,
    [research, assumptions],
  );
  const relative = useMemo(
    () => relativeValue(assumptions.eps, assumptions.targetPe),
    [assumptions.eps, assumptions.targetPe],
  );
  const simulation = useMemo(() => monteCarloValuation(assumptions), [assumptions]);
  const periodsPerYear = research?.historyInterval === "daily" ? 252 : 12;
  const factors = useMemo(
    () => research
      ? factorLens(research.price, assumptions, research.fundamentals.roic, research.fundamentals.operatingMargin, research.priceHistory, periodsPerYear)
      : [],
    [research, assumptions, periodsPerYear],
  );
  const risk = useMemo(() => research ? riskMetrics(research.priceHistory, periodsPerYear) : null, [research, periodsPerYear]);
  const garch = useMemo(() => research ? garch11(research.priceHistory, periodsPerYear) : null, [research, periodsPerYear]);
  const tailRisk = useMemo(() => research ? historicalTailRisk(research.priceHistory) : null, [research]);
  const marketRisk = useMemo(
    () => research ? monteCarloMarketRisk(research.priceHistory, periodsPerYear, research.historyInterval === "daily" ? 10 : 3) : null,
    [research, periodsPerYear],
  );
  const narrative = useMemo(
    () => analyzeNarrative(research?.articles ?? [], profile.hypothesis),
    [research, profile.hypothesis],
  );
  const supportedFactors = useMemo(
    () => factors.filter((factor) => research?.coverage.fundamentals || (risk && ["Momentum", "Low volatility"].includes(factor.label))),
    [factors, research, risk],
  );
  const opinion = useMemo(
    () => research ? buildEducationalOpinion(research, assumptions, profile) : null,
    [research, assumptions, profile],
  );
  const analysis = useMemo(
    () => research && opinion
      ? buildAnalysisSummary(research, opinion, valuation, relative, reverseGrowth, risk, garch, tailRisk, marketRisk, narrative)
      : null,
    [research, opinion, valuation, relative, reverseGrowth, risk, garch, tailRisk, marketRisk, narrative],
  );
  const activeQuizItems = useMemo(
    () => research && analysis ? buildContextualQuiz(research, analysis, reverseGrowth, risk, narrative) : [],
    [research, analysis, reverseGrowth, risk, narrative],
  );
  const score = activeQuizItems.reduce((total, item, index) => total + Number(quiz[index] === item.correct), 0);
  const quizComplete = Object.keys(quiz).length === activeQuizItems.length;

  function advance(next: number) {
    setCompletedThrough((current) => Math.max(current, next));
    setActiveStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginJourney() {
    advance(1);
  }

  function answerQuiz(index: number, optionIndex: number) {
    const nextQuiz = { ...quiz, [index]: optionIndex };
    setQuiz(nextQuiz);
    const completed = activeQuizItems.every((_, itemIndex) => nextQuiz[itemIndex] !== undefined);
    if (completed) setOpinionUnlocked(true);
  }

  function resetSession() {
    if (!research) return;
    window.localStorage.removeItem(`longview-learning:${research.identity.symbol}`);
    setProfile(defaultHypothesis);
    setActiveStage(0);
    setCompletedThrough(0);
    setQuiz({});
    setOpinionUnlocked(false);
    setTutor(null);
  }

  async function askTutor() {
    if (!research) return;
    setTutorLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: research.identity.symbol,
          price: research.price,
          dcfValue: valuation,
          growthRate: assumptions.growthRate,
          discountRate: assumptions.discountRate,
          terminalGrowth: assumptions.terminalGrowth,
          fcfPerShare: assumptions.fcfPerShare,
          coverage: research.coverage,
          analysisMode: opinion?.valuationMethod ? "valuation" : "narrative",
          company: research.identity.name,
          articleCount: narrative.articleCount,
          publisherCount: narrative.publisherCount,
          dominantTheme: narrative.dominantTheme,
          themeEntropy: narrative.themeEntropy,
          headlines: (research.articles ?? []).slice(0, 8).map((article) => ({
            title: article.title,
            publisher: article.publisher,
            publishedAt: article.publishedAt,
          })),
          historyObservations: research.priceHistory.length,
          historyInterval: research.historyInterval,
        }),
      });
      if (!response.ok) throw new Error("Tutor unavailable");
      setTutor(await response.json() as TutorResponse);
    } catch {
      setTutor({
        mode: "deterministic",
        summary: !opinion?.valuationMethod
          ? "The optional language tutor is unavailable. The deterministic tutor can still challenge the public narrative and explain why a financial valuation is withheld."
          : "The optional language tutor is unavailable, but the calculation and learning path remain complete.",
        pressurePoints: !opinion?.valuationMethod ? [
          `${narrative.articleCount} sampled headlines are secondary evidence, not verified operating facts.`,
          `${narrative.publisherCount} publishers may still repeat the same underlying story.`,
          "Reported model-ready cash flows are required before a DCF can be interpreted.",
        ] : [
          "Reconcile free cash flow per share to a dated source.",
          "Test a wider discount-rate range.",
          "Check whether terminal value dominates the result.",
        ],
        lesson: !opinion?.valuationMethod
          ? "Quant research can measure narrative breadth, concentration and price behaviour without pretending those measures are a financial valuation."
          : "A model is useful when its assumptions can be inspected, challenged and reproduced.",
      });
    } finally {
      setTutorLoading(false);
    }
  }

  if (error) {
    return (
      <main className="learning-workspace">
        <div className="fatal-card"><AlertTriangle /><h1>Learning desk unavailable</h1><p>{error}</p><SecuritySearch compact /></div>
      </main>
    );
  }

  if (!research || !opinion || !analysis) {
    return (
      <main className="learning-workspace">
        <div className="loading-desk"><LoaderCircle className="spin" /><span>RESOLVING SECURITY</span><h1>Checking identity, coverage and available evidence…</h1></div>
      </main>
    );
  }

  const priceChange = research.price && research.previousClose ? research.price / research.previousClose - 1 : null;
  const currency = research.identity.currency === "—" ? "" : research.identity.currency;
  const formatMoney = (value: number | null) =>
    value === null || !Number.isFinite(value) ? "Unavailable" : `${currency} ${value.toFixed(value >= 100 ? 0 : 2)}`;
  const prompt = learningPrompt(profile, research.identity.name);
  const hasFinancialModel = opinion.modelRange !== null;
  const earningsScenario = opinion.modelRange ? [
    { label: "Low", value: opinion.modelRange.low },
    { label: "Base", value: opinion.modelRange.midpoint },
    { label: "High", value: opinion.modelRange.high },
    ...(research.price === null ? [] : [{ label: "Price", value: research.price }]),
  ] : [];

  return (
    <main className="learning-workspace">
      <section className="learning-security-bar">
        <div className="security-identity">
          <span>{research.identity.symbol}</span>
          <div>
            <small>{research.identity.exchange} · {research.identity.country} · {research.identity.currency}</small>
            <h1>{research.identity.name}</h1>
          </div>
        </div>
        <div className="security-reference">
          <small>REFERENCE PRICE</small>
          <strong>{research.price === null ? "Not available" : formatMoney(research.price)}</strong>
          {priceChange !== null && <span className={priceChange >= 0 ? "positive" : "negative"}>{priceChange >= 0 ? "+" : ""}{(priceChange * 100).toFixed(2)}%</span>}
          <i>{research.asOf}</i>
        </div>
        <div className={`coverage-seal coverage-${opinion.coverage}`}>
          <small>{opinion.coverage.toUpperCase()} COVERAGE</small>
          <strong>{research.mode === "sample" ? "Sample + current public coverage" : research.mode === "live" ? "Public market and article data" : "Public research only"}</strong>
          <span>{research.note}</span>
        </div>
      </section>

      <nav className="journey-nav" aria-label="Learning stages">
        {stages.map((stage, index) => {
          const available = index <= completedThrough;
          return (
            <button
              type="button"
              key={stage.short}
              disabled={!available}
              className={activeStage === index ? "active" : index < activeStage ? "complete" : ""}
              onClick={() => available && setActiveStage(index)}
            >
              <span>{index < completedThrough ? <Check /> : `0${index + 1}`}</span>
              <strong>{stage.short}</strong>
              <small>{available ? stage.label : "Complete the previous stage"}</small>
            </button>
          );
        })}
      </nav>

      <div className="learning-toolbar">
        <SecuritySearch compact />
        <button type="button" className="text-button" onClick={resetSession}><RefreshCcw /> Restart lesson</button>
      </div>

      {activeStage === 0 && (
        <StageShell
          eyebrow="01 / STARTING POINT"
          title="Begin with what you think you know."
          intro="Institutional research begins with a claim that can be tested. Your answers shape the teaching emphasis only; every reader receives the same underlying financial analysis."
        >
          <div className="intake-grid">
            <div className="intake-main">
              <fieldset>
                <legend>What first drew your attention?</legend>
                <div className="choice-grid">
                  {attentionOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={profile.attention === option.value ? "selected" : ""}
                      onClick={() => setProfile({ ...profile, attention: option.value })}
                    >
                      {profile.attention === option.value && <Check />}
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>How familiar are you with this company?</legend>
                <div className="knowledge-grid">
                  {knowledgeOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={profile.understanding === option.value ? "selected" : ""}
                      onClick={() => setProfile({ ...profile, understanding: option.value })}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="hypothesis-field">
                <span>What do you currently believe or want to test? <i>Optional</i></span>
                <textarea
                  maxLength={280}
                  value={profile.hypothesis}
                  onChange={(event) => setProfile({ ...profile, hypothesis: event.target.value })}
                  placeholder={`Example: “${research.identity.name} benefits from a durable industry trend, but I do not know what growth the current price already assumes.”`}
                />
                <small>{profile.hypothesis.length}/280 · Do not include holdings, income, risk tolerance or personal financial details.</small>
              </label>

              {containsAdviceRequest(profile.hypothesis) && (
                <div className="boundary-note">
                  <ShieldCheck />
                  <p><strong>Longview cannot answer a transaction question.</strong> It will reinterpret your input as a request to understand evidence, assumptions and model mechanics.</p>
                </div>
              )}

              <button type="button" className="primary-action" onClick={beginJourney}>
                Begin the guided analysis <ArrowRight />
              </button>
            </div>

            <aside className="intake-aside">
              <span>EDUCATIONAL BOUNDARY</span>
              <h3>Your curiosity personalises the lesson—not the opinion.</h3>
              <ul>
                <li><CheckCircle2 /> No suitability profile</li>
                <li><CheckCircle2 /> No position sizing</li>
                <li><CheckCircle2 /> No buy, sell or hold output</li>
                <li><CheckCircle2 /> Identical core model for every reader</li>
              </ul>
              <p>Longview is an independent quant-literacy publication. It explains how an institutional analyst might investigate a question without deciding what you should do.</p>
            </aside>
          </div>
        </StageShell>
      )}

      {activeStage === 1 && (
        <StageShell
          eyebrow="02 / AUTOMATIC LEARNING ROADMAP"
          title="Here is how Longview will investigate the question."
          intro="This is an explanation, not an approval request. The research method is standardised and the analysis has already begun."
        >
          <div className="starting-thesis">
            <Lightbulb />
            <div><small>YOUR STARTING POINT</small><strong>{prompt.startingPoint}</strong><p>{prompt.emphasis}</p></div>
          </div>
          <div className="roadmap-grid">
            <RoadmapCard number="01" icon={<Database />} title="Verify the evidence boundary" detail="Separate available observations from missing fundamentals and demonstration data." learning="Source quality before conclusions" />
            <RoadmapCard number="02" icon={<Scale />} title="Build the counter-case" detail="Look for the strongest reason the opening idea could be incomplete." learning="Falsification, not confirmation" />
            <RoadmapCard
              number="03"
              icon={<Binary />}
              title={opinion.valuationMethod === "Discounted cash flow" ? "Map cash-flow expectations" : opinion.valuationMethod === "Earnings-multiple scenario" ? "Map earnings expectations" : opinion.valuationMethod === "Revenue-multiple scenario" ? "Map revenue expectations" : "Map the public narrative"}
              detail={opinion.valuationMethod === "Discounted cash flow" ? "Use reverse DCF to solve for growth implied by price and assumptions." : opinion.valuationMethod === "Earnings-multiple scenario" ? "Use reported earnings and a stated comparison multiple because industrial free cash flow is unavailable or unsuitable." : opinion.valuationMethod === "Revenue-multiple scenario" ? "Use revenue per share and a transparent EV-to-sales scenario because positive earnings and cash flow are unavailable." : "Group current headlines by sector, capital, execution, policy and competition themes."}
              learning={hasFinancialModel ? "Price is not the same as value" : "Attention is not the same as evidence"}
            />
            <RoadmapCard
              number="04"
              icon={<FlaskConical />}
              title={hasFinancialModel ? "Stress the selected model" : "Measure what the data supports"}
              detail={hasFinancialModel ? "Compare the selected valuation range with systematic characteristics and historical risk." : "Calculate source diversity, theme entropy and available price-history risk without inventing fundamentals."}
              learning={hasFinancialModel ? "Ranges before false precision" : "Use a smaller method when evidence is smaller"}
            />
            <RoadmapCard number="05" icon={<BookOpen />} title="Publish and reflect" detail="Separate facts, calculations, interpretation and Longview's model opinion." learning="Understand before reading the full rationale" />
          </div>
          <InstitutionalLens
            institutional="An analyst defines the question, establishes an evidence hierarchy and chooses methods that fit the business before interpreting results."
            plain="Longview will not force every company through the same formula or quietly fill missing data."
            limitation={hasFinancialModel ? "Automatic public financial series should be reconciled to issuer filings before interpretation." : "This path can map public coverage and market behaviour, but financial valuation remains withheld until reported inputs exist."}
          />
          <StageContinue label="Continue to the evidence desk" onClick={() => advance(2)} />
        </StageShell>
      )}

      {activeStage === 2 && (
        <StageShell
          eyebrow="03 / EVIDENCE DESK"
          title="Scan the public conversation."
          intro="This desk is reserved for secondary research: current public coverage, the themes it emphasises and the claims that still need primary-source verification."
        >
          <NarrativeBriefing narrative={narrative} articles={research.articles ?? []} />
          <div className="evidence-grid">
            {opinion.evidence.filter((item) => item.id.startsWith("public-")).map((item) => (
              <article className={`evidence-card evidence-${item.direction}`} key={item.id}>
                <header>
                  <span>{item.layer}</span>
                  <i>{item.direction}</i>
                </header>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <footer>
                  {item.url ? <ExternalLink /> : <Database />}
                  {item.url
                    ? <a href={item.url} target="_blank" rel="noreferrer">{item.sourceLabel}<span className="sr-only"> — open source</span></a>
                    : <span>{item.sourceLabel}</span>}
                  <small>{item.theme ? `${item.theme} · ` : ""}{item.tier} · {item.asOf}</small>
                </footer>
              </article>
            ))}
          </div>
          <InstitutionalLens
            institutional="A professional secondary-research scan maps sector forces, company developments and contradictory narratives before numbers are interpreted."
            plain="Coverage tells you what the market is discussing. It does not prove that a claim is true or that it will change the stock price."
            limitation="Headlines are research leads, not financial inputs. The Quant Lab separately inventories filings, market data and model eligibility."
          />
          <StageContinue label="Continue to the automatic Quant Lab" onClick={() => advance(3)} />
        </StageShell>
      )}

      {activeStage === 3 && (
        <StageShell
          eyebrow="04 / AUTOMATIC QUANT LAB"
          title="Let the models disagree in public."
          intro="Longview runs its default methods automatically. You can inspect advanced sensitivities, but no configuration is required to complete the lesson."
          dark
        >
          <ModelSelectionPanel research={research} opinion={opinion} garch={garch} />
          <DataToModelMap research={research} opinion={opinion} garch={garch} />
          <QuantMethodGuide analysis={analysis} />
          <ModelCatalogue research={research} opinion={opinion} garch={garch} tailRisk={tailRisk} />
          <div className="quant-readout-grid">
            {opinion.valuationMethod === "Discounted cash flow" && valuation !== null ? <>
              <QuantReadout label="Market-implied FCF growth" value={reverseGrowth === null ? "Unavailable" : `${(reverseGrowth * 100).toFixed(1)}%`} detail="Solved backwards from the reference price" tone="lime" />
              <QuantReadout label="Scenario DCF" value={formatMoney(valuation)} detail="Mechanical result under displayed defaults" tone="blue" />
              <QuantReadout label="Model distribution" value={`${formatMoney(simulation.p10)}–${formatMoney(simulation.p90)}`} detail="P10–P90 across seeded assumptions" tone="amber" />
              <QuantReadout label="Relative comparison" value={formatMoney(relative)} detail={`${assumptions.targetPe.toFixed(1)}× comparison multiple`} tone="white" />
            </> : opinion.valuationMethod === "Earnings-multiple scenario" && opinion.modelRange ? <>
              <QuantReadout label="Selected valuation model" value="P/E scenario" detail="Chosen because earnings exist while industrial FCF is unavailable or unsuitable" tone="lime" />
              <QuantReadout label="Reported EPS" value={assumptions.eps.toFixed(2)} detail="Automatically extracted earnings per share" tone="blue" />
              <QuantReadout label="Model range" value={`${formatMoney(opinion.modelRange.low)}–${formatMoney(opinion.modelRange.high)}`} detail="Low-to-high earnings-multiple scenario" tone="amber" />
              <QuantReadout label="Embedded P/E" value={research.price ? `${(research.price / assumptions.eps).toFixed(1)}×` : "Unavailable"} detail="Reference price divided by reported EPS" tone="white" />
            </> : opinion.valuationMethod === "Revenue-multiple scenario" && opinion.modelRange ? <>
              <QuantReadout label="Selected valuation model" value="EV / sales" detail="Chosen because revenue exists while positive earnings and cash flow do not" tone="lime" />
              <QuantReadout label="Revenue per share" value={formatMoney(research.fundamentals.revenuePerShare ?? null)} detail="Automatically extracted reported revenue divided by diluted shares" tone="blue" />
              <QuantReadout label="Model range" value={`${formatMoney(opinion.modelRange.low)}–${formatMoney(opinion.modelRange.high)}`} detail="Low-to-high revenue-multiple scenario" tone="amber" />
              <QuantReadout label="Embedded P/S" value={research.price && research.fundamentals.revenuePerShare ? `${(research.price / research.fundamentals.revenuePerShare).toFixed(1)}×` : "Unavailable"} detail="Reference price divided by reported revenue per share" tone="white" />
            </> : <>
              <QuantReadout label="Public coverage sample" value={`${narrative.articleCount}`} detail={`Headlines from ${narrative.publisherCount} publishers`} tone="lime" />
              <QuantReadout label="Source diversity" value={`${Math.round(narrative.sourceDiversity * 100)}%`} detail="Distinct publishers divided by sampled headlines" tone="blue" />
              <QuantReadout label="Theme entropy" value={narrative.articleCount ? narrative.themeEntropy.toFixed(2) : "No sample"} detail="0 = concentrated · 1 = evenly distributed" tone="amber" />
              <QuantReadout label="History depth" value={`${research.priceHistory.length}`} detail={`${research.historyInterval ?? "monthly"} price observations`} tone="white" />
            </>}
          </div>

          <div className="quant-chart-grid">
            {opinion.valuationMethod === "Discounted cash flow" && valuation !== null ? (
              <article className="quant-chart">
                <header><span>UNCERTAINTY DISTRIBUTION</span><strong>1,600 reproducible simulations</strong><small>Not a forecast probability</small></header>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={simulation.buckets}>
                    <defs><linearGradient id="learningSimulation" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7ff4a" stopOpacity={0.7} /><stop offset="100%" stopColor="#c7ff4a" stopOpacity={0.03} /></linearGradient></defs>
                    <CartesianGrid stroke="#2a3631" vertical={false} />
                    <XAxis dataKey="label" stroke="#718078" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                    <Area type="monotone" dataKey="count" stroke="#c7ff4a" fill="url(#learningSimulation)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </article>
            ) : opinion.valuationMethod === "Earnings-multiple scenario" || opinion.valuationMethod === "Revenue-multiple scenario" ? (
              <article className="quant-chart">
                <header><span>{opinion.valuationMethod === "Revenue-multiple scenario" ? "REVENUE-MULTIPLE SCENARIO" : "EARNINGS-MULTIPLE SCENARIO"}</span><strong>Low, base and high model values versus price</strong><small>Conditional comparison</small></header>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={earningsScenario}>
                    <CartesianGrid stroke="#2a3631" vertical={false} />
                    <XAxis dataKey="label" stroke="#93a099" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                    <Bar dataKey="value" fill="#c7ff4a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            ) : (
              <article className="quant-chart">
                <header><span>PUBLIC NARRATIVE MAP</span><strong>Headline themes by frequency</strong><small>Secondary sources</small></header>
                {narrative.themes.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={narrative.themes} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid stroke="#2a3631" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="theme" type="category" width={105} stroke="#93a099" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                      <Bar dataKey="count" fill="#c7ff4a" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyModel label="No current public coverage returned" />}
              </article>
            )}
            <article className="quant-chart">
              <header><span>HISTORICAL PRICE SERIES</span><strong>{research.priceHistory.length} {research.historyInterval ?? "monthly"} observations</strong><small>Descriptive only</small></header>
              {research.priceHistory.length > 2 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={research.priceHistory}>
                    <CartesianGrid stroke="#2a3631" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                    <Line dataKey="close" type="monotone" dot={false} stroke="#8bd4ff" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyModel label="Price history is unavailable" />}
            </article>
          </div>

          <div className="factor-and-risk">
            <article>
              <header><span>{supportedFactors.length ? "SUPPORTED FACTOR PROXIES" : "NARRATIVE QUANT METHODS"}</span><small>Characteristics, not signals</small></header>
              {supportedFactors.length ? supportedFactors.map((factor) => (
                  <div className="factor-row" key={factor.label}>
                    <strong>{factor.label}</strong>
                    <i><b style={{ width: `${factor.score}%` }} /></i>
                    <span>{factor.score.toFixed(0)}</span>
                    <small>{factor.detail}</small>
                  </div>
                )) : (
                  <div className="narrative-methods">
                    <p><strong>Source diversity</strong><span>How many independent publishers appear in the sample.</span></p>
                    <p><strong>Shannon entropy</strong><span>How concentrated or dispersed the headline themes are.</span></p>
                    <p><strong>Hypothesis overlap</strong><span>{narrative.hypothesisMatches} headlines share a material term with the opening hypothesis.</span></p>
                  </div>
                )}
            </article>
            <article>
              <header><span>HISTORICAL RISK SNAPSHOT</span><small>Based on available {research.historyInterval ?? "monthly"} data</small></header>
              <div className="risk-grid">
                <p><small>Annualised return*</small><strong>{risk ? `${(risk.annualReturn * 100).toFixed(1)}%` : "Not enough history"}</strong></p>
                <p><small>Volatility</small><strong>{risk ? `${(risk.volatility * 100).toFixed(1)}%` : "Not enough history"}</strong></p>
                <p><small>Return / volatility</small><strong>{risk ? risk.sharpe.toFixed(2) : "Not enough history"}</strong></p>
                <p><small>Maximum drawdown</small><strong>{risk ? `${(risk.maxDrawdown * 100).toFixed(1)}%` : "Not enough history"}</strong></p>
              </div>
              <p className="micro-note">*Arithmetic annualisation. Short histories create unstable estimates and do not predict future outcomes.</p>
            </article>
          </div>

          <RiskModelPanel research={research} garch={garch} tailRisk={tailRisk} marketRisk={marketRisk} />

          {opinion.valuationMethod === "Discounted cash flow" && valuation !== null ? (
            <details className="advanced-lab">
              <summary><FlaskConical /> Inspect the advanced sensitivity lab <ChevronRight /></summary>
              <div className="advanced-grid">
                <div className="assumption-controls">
                  <NumberField label="FCF per share" value={assumptions.fcfPerShare} step={0.1} onChange={(value) => setAssumptions({ ...assumptions, fcfPerShare: value })} />
                  <RangeField label="Forecast growth" value={assumptions.growthRate} min={-0.1} max={0.4} step={0.005} percent onChange={(value) => setAssumptions({ ...assumptions, growthRate: value })} />
                  <RangeField label="Discount rate" value={assumptions.discountRate} min={0.06} max={0.18} step={0.005} percent onChange={(value) => setAssumptions({ ...assumptions, discountRate: value })} />
                  <RangeField label="Terminal growth" value={assumptions.terminalGrowth} min={0} max={0.06} step={0.0025} percent onChange={(value) => setAssumptions({ ...assumptions, terminalGrowth: value })} />
                  <RangeField label="Forecast years" value={assumptions.forecastYears} min={3} max={10} step={1} onChange={(value) => setAssumptions({ ...assumptions, forecastYears: value })} />
                </div>
                <SensitivityMatrix assumptions={assumptions} />
              </div>
            </details>
          ) : opinion.valuationMethod === "Earnings-multiple scenario" && opinion.modelRange ? (
            <section className="earnings-model-panel">
              <Scale />
              <div>
                <span>SELECTED MODEL · EARNINGS-MULTIPLE SCENARIO</span>
                <h3>Longview found usable earnings, but not a suitable industrial free-cash-flow model.</h3>
                <p>The engine therefore compares reported EPS with a transparent low, base and high P/E range. For banks, this is only an initial cross-check: book value, sustainable return on equity, regulatory capital and credit quality remain essential follow-up work.</p>
              </div>
            </section>
          ) : opinion.valuationMethod === "Revenue-multiple scenario" && opinion.modelRange ? (
            <section className="earnings-model-panel">
              <Scale />
              <div>
                <span>SELECTED MODEL · REVENUE-MULTIPLE SCENARIO</span>
                <h3>Longview found reported revenue, but not positive earnings or free cash flow.</h3>
                <p>The engine therefore uses revenue per share, net debt per share and a transparent low, base and high EV-to-sales range. This is not the only way to value a company; it is the most defensible automated cross-check supported by the extracted data. Future margins, capital intensity, peer selection and dilution are major limitations.</p>
              </div>
            </section>
          ) : (
            <section className="model-boundary-panel">
              <AlertTriangle />
              <div>
                <span>VALUATION MODEL WITHHELD</span>
                <h3>This is a data boundary, not a broken control.</h3>
                <p>A defensible DCF needs dated free cash flow, share count, balance-sheet data and enough reporting history. Longview found no model-ready series, so it switches to narrative breadth, theme entropy and available market-behaviour statistics.</p>
              </div>
            </section>
          )}

          <InstitutionalLens
            institutional="Quant researchers use multiple models because every method answers a narrower question and carries different failure modes."
            plain={hasFinancialModel ? "The selected range is useful because it makes the model choice and its assumptions inspectable." : "When financial inputs are missing, quant work can still measure source breadth, topic concentration and observed price behaviour."}
            limitation={hasFinancialModel ? "Factor scores and valuation ranges are transparent educational proxies, not licensed institutional signals or recommendations." : "Headline classification is a research triage tool. It is not sentiment truth, a company fundamental or a trading signal."}
            dark
          />
          <StageContinue label="Continue to the opinion preview" onClick={() => advance(4)} dark />
        </StageShell>
      )}

      {activeStage === 4 && (
        <StageShell
          eyebrow="05 / INDEPENDENT EDUCATIONAL OPINION"
          title={opinion.title}
          intro={opinion.dek}
        >
          {!opinionUnlocked ? (
            <>
              <OpinionHeader research={research} opinion={opinion} analysis={analysis} formatMoney={formatMoney} />
              <SectorSynthesis analysis={analysis} />
              <div className="opinion-columns">
                <article className="opinion-thesis">
                  <span>THE THESIS</span>
                  <h3>{opinion.thesis}</h3>
                </article>
                <article className="opinion-counter">
                  <span>THE COUNTER-THESIS</span>
                  <h3>{opinion.counterThesis}</h3>
                </article>
              </div>
              <article className="model-opinion">
                <span>LONGVIEW MODEL OPINION</span>
                <h3>{opinion.modelOpinion}</h3>
                <p>This is standardised educational commentary. It is not a recommendation, suitability assessment or prediction that a market price will reach a displayed model value.</p>
              </article>
              <div className="opinion-lock">
                <LockKeyhole />
                <div>
                  <small>COMPLETE RATIONALE LOCKED</small>
                  <h3>Understand the method before reading the full opinion.</h3>
                  <p>Risks, limitations and the headline model view remain visible. Complete three short learning checks to unlock the source ledger and full rationale.</p>
                </div>
                <button type="button" onClick={() => advance(5)}>Begin education debrief <ArrowRight /></button>
              </div>
            </>
          ) : (
            <FullOpinion research={research} opinion={opinion} analysis={analysis} assumptions={assumptions} formatMoney={formatMoney} />
          )}

          <InstitutionalLens
            institutional="Editorial discipline means clearly separating facts, calculations, source interpretation and the publication's own model opinion."
            plain="The opinion can be challenged because its assumptions, counter-case and unresolved questions remain visible."
            limitation="This opinion uses the exact data timestamp and coverage shown above. It should not be treated as current after that date."
          />
          {!opinionUnlocked && <StageContinue label="Continue to the education debrief" onClick={() => advance(5)} />}
        </StageShell>
      )}

      {activeStage === 5 && (
        <StageShell
          eyebrow="06 / EDUCATION DEBRIEF"
          title="Return to the idea you started with."
          intro="The lesson is complete when you can explain how the evidence and model assumptions changed—or limited—your original understanding."
        >
          <div className="debrief-arc">
            <article>
              <span>YOU STARTED HERE</span>
              <h3>{prompt.startingPoint}</h3>
              <p>{prompt.emphasis}</p>
            </article>
            <ArrowRight />
            <article>
              <span>THE EVIDENCE LEDGER</span>
              <h3>{opinion.evidence.filter((item) => item.direction === "supports").length} supporting · {opinion.evidence.filter((item) => item.direction === "challenges").length} challenging · {opinion.evidence.filter((item) => item.direction === "context").length} contextual · {opinion.evidence.filter((item) => item.direction === "limitation").length} limitations</h3>
              <p>The model preserves disagreement rather than reducing it to one sentiment score.</p>
            </article>
            <ArrowRight />
            <article>
              <span>THE EDUCATIONAL REFLECTION</span>
              <h3>{opinion.hypothesisStatus}</h3>
              <p>{opinion.modelOpinion}</p>
            </article>
          </div>

          <DebriefFindings analysis={analysis} />
          <EvidenceLearningGuide analysis={analysis} />

          <div className="tutor-panel tutor-panel-light">
            <BrainCircuit />
            <div>
              <small>OPTIONAL AI STUDY COACH</small>
              <strong>Ask for a plain-English challenge to your understanding.</strong>
              <p>This optional coach is separate from the canonical analysis. Gemini receives only non-personal analytical inputs, with a deterministic fallback when the free tier is limited.</p>
            </div>
            <button type="button" disabled={tutorLoading} onClick={askTutor}>
              {tutorLoading ? <><LoaderCircle className="spin" /> Working…</> : <><Sparkles /> Challenge my understanding</>}
            </button>
          </div>
          {tutor && (
            <div className="tutor-response tutor-response-light">
              <small>{tutor.mode === "gemini" ? `GEMINI · ${tutor.model}` : "DETERMINISTIC STUDY COACH"}</small>
              <h3>{tutor.summary}</h3>
              <ul>{tutor.pressurePoints.map((point) => <li key={point}>{point}</li>)}</ul>
              <p><BookOpen /> {tutor.lesson}</p>
            </div>
          )}

          <LearningTakeaways research={research} opinion={opinion} analysis={analysis} risk={risk} garch={garch} tailRisk={tailRisk} />

          <section className="knowledge-check">
            <header><span>THREE-MINUTE CHECK</span><h2>Can you explain the opinion rather than repeat it?</h2></header>
            <div className="quiz-grid-new">
              {activeQuizItems.map((item, index) => (
                <article key={item.question}>
                  <small>0{index + 1}</small>
                  <h3>{item.question}</h3>
                  <div>
                    {item.options.map((option, optionIndex) => (
                      <button
                        type="button"
                        key={option}
                        className={quiz[index] === optionIndex ? "selected" : ""}
                        onClick={() => answerQuiz(index, optionIndex)}
                      >
                        {quiz[index] === optionIndex && <Check />}
                        {option}
                      </button>
                    ))}
                  </div>
                  {quiz[index] !== undefined && <p className={quiz[index] === item.correct ? "correct" : "review"}>{item.explanation}</p>}
                </article>
              ))}
            </div>
          </section>

          {quizComplete && (
            <div className="unlock-banner unlocked">
              {score === activeQuizItems.length ? <CheckCircle2 /> : <CircleHelp />}
              <div>
                <small>{score}/3 CHECKS CORRECT · DEBRIEF COMPLETE</small>
                <h3>{score === activeQuizItems.length ? "The complete Educational Opinion Piece is unlocked." : "The opinion is unlocked. Review the highlighted explanations as you read it."}</h3>
              </div>
              <button type="button" onClick={() => advance(4)}>Read the complete opinion <ArrowRight /></button>
            </div>
          )}

          <div className="advice-boundary">
            <ShieldCheck />
            <div>
              <span>THE FINAL BOUNDARY</span>
              <h3>Longview has explained an analytical process. It has not decided whether this security belongs in your life.</h3>
              <p>The service does not consider objectives, finances, holdings, loss capacity or needs. It does not recommend a transaction or course of action.</p>
            </div>
          </div>
        </StageShell>
      )}

    </main>
  );
}

function StageShell({
  eyebrow,
  title,
  intro,
  dark = false,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`journey-stage ${dark ? "journey-stage-dark" : ""}`}>
      <header className="journey-heading">
        <span>{eyebrow}</span>
        <div><h2>{title}</h2><p>{intro}</p></div>
      </header>
      {children}
    </section>
  );
}

function RoadmapCard({ number, icon, title, detail, learning }: { number: string; icon: React.ReactNode; title: string; detail: string; learning: string }) {
  return <article><header><span>{number}</span>{icon}</header><h3>{title}</h3><p>{detail}</p><small>{learning}</small></article>;
}

function InstitutionalLens({ institutional, plain, limitation, dark = false }: { institutional: string; plain: string; limitation: string; dark?: boolean }) {
  return (
    <div className={`institutional-lens ${dark ? "lens-dark" : ""}`}>
      <article><Target /><div><span>INSTITUTIONAL LENS</span><p>{institutional}</p></div></article>
      <article><Lightbulb /><div><span>PLAIN ENGLISH</span><p>{plain}</p></div></article>
      <article><AlertTriangle /><div><span>LIMITATION</span><p>{limitation}</p></div></article>
    </div>
  );
}

function StageContinue({ label, onClick, dark = false }: { label: string; onClick: () => void; dark?: boolean }) {
  return <div className={`stage-continue ${dark ? "stage-continue-dark" : ""}`}><span>Longview proceeds automatically. This button only moves you to the next explanation.</span><button type="button" onClick={onClick}>{label}<ArrowRight /></button></div>;
}

function HypothesisLedger({ profile, opinion }: { profile: HypothesisProfile; opinion: EducationalOpinion }) {
  return (
    <div className="hypothesis-ledger">
      <header><Lightbulb /><span>LEARNING LEDGER</span><strong>{opinion.hypothesisStatus}</strong></header>
      <div>
        <p><small>Starting idea</small><strong>{profile.hypothesis.trim() || "Exploratory—no fixed thesis supplied"}</strong></p>
        <p><small>What Longview tests</small><strong>Whether the available evidence and market-implied expectations support, challenge or limit that idea</strong></p>
        <p><small>What never changes</small><strong>Financial inputs and the core opinion remain standardised for this security and data snapshot</strong></p>
      </div>
    </div>
  );
}

function NarrativeBriefing({ narrative, articles }: { narrative: NarrativeSignals; articles: PublicArticle[] }) {
  if (!articles.length) {
    return (
      <section className="narrative-briefing narrative-empty">
        <Newspaper />
        <div>
          <span>PUBLIC COVERAGE SCAN</span>
          <h3>No current public headlines were returned.</h3>
          <p>Longview will keep the evidence boundary visible rather than fill the page with generic claims.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="narrative-briefing">
      <header>
        <div><Newspaper /><span>PUBLIC COVERAGE SCAN</span></div>
        <small>Headline metadata only · open sources for full context</small>
      </header>
      <div className="narrative-metrics">
        <p><small>HEADLINES</small><strong>{narrative.articleCount}</strong><span>current public articles sampled</span></p>
        <p><small>PUBLISHERS</small><strong>{narrative.publisherCount}</strong><span>{Math.round(narrative.sourceDiversity * 100)}% source diversity</span></p>
        <p><small>DOMINANT THEME</small><strong>{narrative.dominantTheme}</strong><span>{Math.round(narrative.dominantShare * 100)}% of the sample</span></p>
        <p><small>LAST 30 DAYS</small><strong>{narrative.recentCount}</strong><span>recency, not importance</span></p>
      </div>
      <footer>
        <strong>Macro-to-company lesson</strong>
        <p>Sector and policy headlines explain the environment around a company. They become company evidence only when linked to its customers, revenue, margins, capital needs or disclosed risks.</p>
      </footer>
    </section>
  );
}

function QuantMethodGuide({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <section className="quant-method-guide">
      <header>
        <div><span>QUANT PLAYBOOK</span><h3>What is running—and what each method means.</h3></div>
        <p>Each model answers a different question. Longview shows the strategy, output, interpretation and failure mode before presenting the numbers.</p>
      </header>
      <div>
        {analysis.methods.map((method, index) => (
          <article key={method.name}>
            <small>0{index + 1} · {method.strategy}</small>
            <h4>{method.name}</h4>
            <p><strong>Question</strong>{method.question}</p>
            <p><strong>Current result</strong>{method.result}</p>
            <p><strong>How to read it</strong>{method.interpretation}</p>
            <p className="method-limit"><strong>Failure mode</strong>{method.limitation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModelSelectionPanel({
  research,
  opinion,
  garch,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  garch: ReturnType<typeof garch11>;
}) {
  const data = [
    { label: "Reference price", value: research.price === null ? "Missing" : `${research.identity.currency} ${research.price.toFixed(2)}`, available: research.price !== null },
    { label: "Price history", value: `${research.priceHistory.length} observations`, available: research.coverage.history },
    { label: "Free cash flow / share", value: research.fundamentals.fcfPerShare ? research.fundamentals.fcfPerShare.toFixed(2) : "Missing / unsuitable", available: Boolean(research.fundamentals.fcfPerShare) },
    { label: "Earnings / share", value: research.fundamentals.eps ? research.fundamentals.eps.toFixed(2) : "Missing / negative", available: Boolean(research.fundamentals.eps) },
    { label: "Revenue / share", value: research.fundamentals.revenuePerShare ? research.fundamentals.revenuePerShare.toFixed(2) : "Missing", available: Boolean(research.fundamentals.revenuePerShare) },
    { label: "Net debt / share", value: research.fundamentals.netDebtPerShare === undefined ? "Missing" : research.fundamentals.netDebtPerShare.toFixed(2), available: research.fundamentals.netDebtPerShare !== undefined },
  ];
  const reason = opinion.valuationMethod === "Discounted cash flow"
    ? "Positive free cash flow per share, earnings, price and sufficient history support DCF, reverse DCF, relative valuation and risk methods."
    : opinion.valuationMethod === "Earnings-multiple scenario"
      ? "Reported earnings are available, but industrial free cash flow is missing or unsuitable. Longview therefore selects an earnings-multiple scenario plus supported time-series risk models."
    : opinion.valuationMethod === "Revenue-multiple scenario"
      ? "Revenue per share and balance-sheet data are available while positive cash flow and earnings are not. Longview selects a revenue-multiple scenario plus supported time-series risk models."
      : "No model-ready cash flow, earnings or revenue basis was found. Longview runs supported time-series risk models without manufacturing a fair value.";
  return (
    <section className="model-selection-panel">
      <header>
        <div><Database /><span>QUANT INPUT INVENTORY</span></div>
        <strong>Selected stack: {opinion.valuationMethod ?? "No financial valuation"} · {garch ? "GARCH + VaR + Monte Carlo" : "Historical risk"}</strong>
      </header>
      <div className="model-data-grid">
        {data.map((item) => <p className={item.available ? "available" : "missing"} key={item.label}><small>{item.label}</small><strong>{item.value}</strong></p>)}
      </div>
      <footer><strong>Why this model was selected</strong><p>{reason}</p></footer>
    </section>
  );
}

function DataToModelMap({
  research,
  opinion,
  garch,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  garch: ReturnType<typeof garch11>;
}) {
  const rows = [
    {
      input: "Positive free cash flow, net debt and price",
      models: "DCF · reverse DCF · Monte Carlo valuation",
      status: opinion.valuationMethod === "Discounted cash flow" ? "USED" : "NOT READY",
      explanation: "Cash flow is projected and discounted; price is then solved backwards to expose the growth assumption embedded by the market.",
    },
    {
      input: "Positive EPS and price",
      models: "Earnings multiple · reverse P/E",
      status: opinion.valuationMethod === "Earnings-multiple scenario" ? "USED" : research.fundamentals.eps ? "AVAILABLE" : "NOT READY",
      explanation: "Earnings per share becomes a relative-value base. The multiple is an explicit comparison assumption, not a fact about intrinsic value.",
    },
    {
      input: "Revenue per share, net debt and price",
      models: "EV / sales scenario · reverse P/S",
      status: opinion.valuationMethod === "Revenue-multiple scenario" ? "USED" : research.fundamentals.revenuePerShare ? "AVAILABLE" : "NOT READY",
      explanation: "For a pre-profit growth company, revenue supports a smaller relative cross-check when DCF and P/E would be mathematically or economically misleading.",
    },
    {
      input: `${research.priceHistory.length} aligned price observations`,
      models: "GARCH · VaR · expected shortfall · Monte Carlo risk",
      status: research.priceHistory.length >= 20 ? "USED" : "NOT READY",
      explanation: garch ? "Returns support both historical tail statistics and a conditional-volatility fit." : "The available series can support only the risk methods whose minimum history threshold is met.",
    },
  ];
  return (
    <section className="data-model-map">
      <header><div><Workflow /><span>DATA → MODEL MAP</span></div><h3>Each model is activated by the inputs its mathematics requires.</h3></header>
      <div>
        {rows.map((row) => (
          <article key={row.models}>
            <small>{row.status}</small>
            <strong>{row.input}</strong>
            <ArrowRight />
            <h4>{row.models}</h4>
            <p>{row.explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

type ModelStatus = "APPLIED" | "ELIGIBLE" | "BLOCKED";

function ModelCatalogue({
  research,
  opinion,
  garch,
  tailRisk,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  garch: ReturnType<typeof garch11>;
  tailRisk: ReturnType<typeof historicalTailRisk>;
}) {
  const hasHistory = research.priceHistory.length >= 20;
  const models: Array<{ family: string; name: string; status: ModelStatus; purpose: string; reason: string }> = [
    {
      family: "Fundamental valuation",
      name: "DCF / reverse DCF",
      status: opinion.valuationMethod === "Discounted cash flow" ? "APPLIED" : "BLOCKED",
      purpose: "Values operating free cash flow and tests the growth implied by price.",
      reason: opinion.valuationMethod === "Discounted cash flow" ? "Positive model-ready FCF and a reference price were found." : "Needs model-ready operating cash flow, debt, shares and a suitable company structure.",
    },
    {
      family: "Relative valuation",
      name: "Earnings multiple",
      status: opinion.valuationMethod === "Earnings-multiple scenario" ? "APPLIED" : research.fundamentals.eps ? "ELIGIBLE" : "BLOCKED",
      purpose: "Compares price with reported earnings under an explicit multiple range.",
      reason: research.fundamentals.eps ? "Reported EPS is available; peer quality remains a limitation." : "Reported EPS was not found.",
    },
    {
      family: "Pre-profit growth valuation",
      name: "Revenue multiple / EV-to-sales",
      status: opinion.valuationMethod === "Revenue-multiple scenario" ? "APPLIED" : research.fundamentals.revenuePerShare ? "ELIGIBLE" : "BLOCKED",
      purpose: "Uses revenue per share and net debt for a transparent relative-value scenario when earnings and cash flow are not positive.",
      reason: research.fundamentals.revenuePerShare ? "Reported revenue per share is available; peer choice, margins and dilution remain material limitations." : "Reported revenue and diluted share count were not both found.",
    },
    {
      family: "Bank valuation",
      name: "Residual income / justified P-B",
      status: "BLOCKED",
      purpose: "Connects bank value to book equity, sustainable ROE and cost of equity.",
      reason: "Requires book value, capital ratios, sustainable ROE and credit-loss inputs not yet present in the feed.",
    },
    {
      family: "Asset pricing",
      name: "CAPM / Fama–French factor regression",
      status: hasHistory ? "ELIGIBLE" : "BLOCKED",
      purpose: "Estimates market and factor exposures rather than intrinsic value.",
      reason: hasHistory ? "Stock history exists; benchmark and dated factor-return series are still needed for a valid regression." : "Needs aligned stock, benchmark and factor-return histories.",
    },
    {
      family: "Time-series volatility",
      name: "GARCH(1,1)",
      status: garch ? "APPLIED" : "BLOCKED",
      purpose: "Models volatility clustering and updates conditional volatility.",
      reason: garch ? `${garch.observations} returns support the current fit.` : "Longview requires at least 40 return observations.",
    },
    {
      family: "Tail risk",
      name: "Historical VaR / expected shortfall",
      status: tailRisk ? "APPLIED" : "BLOCKED",
      purpose: "Measures the poorer tail of the observed return distribution.",
      reason: tailRisk ? `${tailRisk.observations} observed returns support an empirical estimate.` : "Longview requires at least 20 return observations.",
    },
    {
      family: "Market-risk simulation",
      name: "Monte Carlo returns",
      status: hasHistory ? "APPLIED" : "BLOCKED",
      purpose: "Simulates a transparent market-return distribution over a fixed horizon.",
      reason: hasHistory ? "Uses observed return and volatility inputs with a reproducible seed." : "Needs a usable price-return history.",
    },
    {
      family: "Derivatives pricing",
      name: "Black–Scholes–Merton / binomial tree",
      status: "BLOCKED",
      purpose: "Prices a specified option contract; it does not value the common stock itself.",
      reason: "Needs strike, expiry, option type, risk-free rate, dividend yield and contract-level volatility.",
    },
    {
      family: "Stochastic-volatility derivatives",
      name: "Heston",
      status: "BLOCKED",
      purpose: "Prices derivatives with stochastic volatility and a volatility smile.",
      reason: "Needs an option-price surface across strikes and maturities for calibration.",
    },
    {
      family: "Relative-value trading",
      name: "Cointegration / pairs model",
      status: "BLOCKED",
      purpose: "Tests whether a stock and a defensible peer basket share a stable long-run relationship.",
      reason: "Needs an explicitly selected peer set and aligned histories; automatic ticker similarity is not enough.",
    },
  ];
  return (
    <section className="model-catalogue">
      <header>
        <div><Binary /><span>QUANTITATIVE MODEL LIBRARY</span></div>
        <h3>Real models, selected by question and evidence—not by novelty.</h3>
        <p><strong>Applied</strong> means the app ran the model. <strong>Eligible</strong> means the model is relevant but still needs a named external dataset. <strong>Blocked</strong> means required inputs are absent or the model answers the wrong question.</p>
      </header>
      <div>
        {models.map((model) => (
          <article key={model.name}>
            <div className="model-card-meta">
              <span className={`model-status status-${model.status.toLowerCase()}`}>{model.status}</span>
              <small>{model.family}</small>
            </div>
            <h4>{model.name}</h4>
            <p>{model.purpose}</p>
            <footer>{model.reason}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function RiskModelPanel({
  research,
  garch,
  tailRisk,
  marketRisk,
}: {
  research: SecurityResearch;
  garch: ReturnType<typeof garch11>;
  tailRisk: ReturnType<typeof historicalTailRisk>;
  marketRisk: ReturnType<typeof monteCarloMarketRisk>;
}) {
  return (
    <section className="risk-model-panel">
      <header>
        <div><Gauge /><span>MARKET-RISK MODEL STACK</span></div>
        <h3>Volatility, tail loss and simulation answer risk questions—not fair value.</h3>
      </header>
      <div>
        <article>
          <small>GARCH(1,1)</small>
          <strong>{garch ? `${(garch.currentVolatility * 100).toFixed(1)}%` : "Unavailable"}</strong>
          <p>{garch ? `Current annualised conditional volatility; persistence ${garch.persistence.toFixed(2)}.` : "At least 40 return observations are required."}</p>
        </article>
        <article>
          <small>HISTORICAL 95% VAR</small>
          <strong>{tailRisk ? `${(tailRisk.var95 * 100).toFixed(1)}%` : "Unavailable"}</strong>
          <p>{tailRisk ? `One ${research.historyInterval === "daily" ? "day" : "period"} historical loss threshold; expected shortfall ${(tailRisk.expectedShortfall95 * 100).toFixed(1)}%.` : "At least 20 return observations are required."}</p>
        </article>
        <article>
          <small>MONTE CARLO 95% VAR</small>
          <strong>{marketRisk ? `${(marketRisk.var95 * 100).toFixed(1)}%` : "Unavailable"}</strong>
          <p>{marketRisk ? `${marketRisk.horizonPeriods}-${research.historyInterval === "daily" ? "day" : "period"} seeded market-risk simulation; 99% VaR ${(marketRisk.var99 * 100).toFixed(1)}%.` : "A usable return series is required."}</p>
        </article>
        <article>
          <small>OPTIONS MODELS</small>
          <strong>Not applicable</strong>
          <p>BSM, binomial and Heston require a specified option contract or option surface. They cannot manufacture a common-stock target price.</p>
        </article>
      </div>
      <footer>VaR is reported only as a percentage of the modelled price process. Longview does not calculate a user’s personal exposure, recommend position size or assess suitability.</footer>
    </section>
  );
}

function SectorSynthesis({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <section className="sector-synthesis">
      <header>
        <div><Newspaper /><span>MARKET & COMPANY EVIDENCE SYNTHESIS</span></div>
        <h3>{analysis.sectorSummary}</h3>
        <p>This is Longview’s cross-article reading of the sampled coverage—not a list of headlines and not a forecast.</p>
      </header>
      <div className="evidence-synthesis-grid">
        <article>
          <small>01 / MARKET AND SECTOR FORCES</small>
          <h4>What is changing around the company?</h4>
          <p>{analysis.macroAnalysis}</p>
        </article>
        <article>
          <small>02 / COMPANY-SPECIFIC READING</small>
          <h4>What appears most relevant to this stock?</h4>
          <p>{analysis.companyAnalysis}</p>
        </article>
        <article>
          <small>03 / FINANCIAL TRANSMISSION</small>
          <h4>How could this enter the model?</h4>
          <p>{analysis.financialTransmission}</p>
        </article>
      </div>
      {analysis.sectorSignals.length > 0 && (
        <div className="theme-distribution">
          {analysis.sectorSignals.map((signal) => (
            <article key={signal.theme}>
              <small>{signal.share} OF SAMPLED COVERAGE</small>
              <h4>{signal.theme}</h4>
              <p>{signal.meaning}</p>
              {signal.headlines.length > 0 && <ul>{signal.headlines.map((headline) => <li key={headline}>{headline}</li>)}</ul>}
            </article>
          ))}
        </div>
      )}
      <footer><strong>Evidence boundary:</strong> synthesis can identify a plausible business channel, but only primary disclosures and reported results can confirm that it changed revenue, margins, cash flow, capital needs or risk.</footer>
    </section>
  );
}

function EvidenceLearningGuide({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <section className="evidence-learning-guide">
      <header>
        <div><BookOpen /><span>HOW TO READ THIS ANALYSIS</span></div>
        <h2>Move from headline to business driver before touching the valuation.</h2>
        <p>The educational task is not to memorise Longview’s conclusion. It is to understand which links in the reasoning are observed, inferred, modelled or still unverified.</p>
      </header>
      <div className="learning-chain">
        <article><small>01</small><strong>Observe the claim</strong><p>Start with the exact article or disclosure. A headline is evidence of public attention, not proof of the underlying claim.</p></article>
        <ArrowRight />
        <article><small>02</small><strong>Name the business driver</strong><p>Ask whether the claim concerns demand, price, volume, costs, market share, regulation or capital requirements.</p></article>
        <ArrowRight />
        <article><small>03</small><strong>Find the financial channel</strong><p>Translate that driver into revenue, margins, cash flow, reinvestment or risk. If no channel exists, it should not alter the model.</p></article>
        <ArrowRight />
        <article><small>04</small><strong>Challenge the assumption</strong><p>Check whether a primary disclosure confirms the effect and whether it is large enough to change the valuation assumptions.</p></article>
      </div>
      <div className="learning-application">
        <span>APPLIED TO THIS OPINION</span>
        <h3>{analysis.evidenceBalance}</h3>
        <p>{analysis.financialTransmission}</p>
        <p><strong>Reader’s checkpoint:</strong> Can you identify which part is a headline, which part is Longview’s inference, and which part is a deterministic model output?</p>
      </div>
    </section>
  );
}

function DebriefFindings({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <section className="debrief-findings">
      <header><span>WHAT THE ANALYSIS ACTUALLY FOUND</span><h2>Market context, company implications, quantitative result, combined opinion.</h2></header>
      <div>
        <article><Newspaper /><span>MARKET CONTEXT</span><p>{analysis.macroAnalysis}</p></article>
        <article><Target /><span>COMPANY IMPLICATION</span><p>{analysis.companyAnalysis}</p></article>
        <article><Binary /><span>QUANTITATIVE RESULT</span><p>{analysis.quantFinding}</p></article>
        <article><Scale /><span>COMBINED READING</span><h3>{analysis.posture}</h3><p>{analysis.combinedFinding}</p></article>
      </div>
    </section>
  );
}

function QuantReadout({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "lime" | "blue" | "amber" | "white" }) {
  return <article className={`quant-readout tone-${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function LearningTakeaways({
  research,
  opinion,
  analysis,
  risk,
  garch,
  tailRisk,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  analysis: AnalysisSummary;
  risk: ReturnType<typeof riskMetrics>;
  garch: ReturnType<typeof garch11>;
  tailRisk: ReturnType<typeof historicalTailRisk>;
}) {
  const modelLesson = opinion.valuationMethod === "Discounted cash flow"
    ? "DCF translates operating cash flow into present value; reverse DCF asks what growth the current price already requires."
    : opinion.valuationMethod === "Earnings-multiple scenario"
      ? "A P/E scenario compares price with reported earnings. Its answer changes materially with peer quality, cyclicality and the chosen multiple."
      : opinion.valuationMethod === "Revenue-multiple scenario"
        ? "EV-to-sales is a relative cross-check for a pre-profit company. It cannot answer whether today’s revenue will ever become durable cash flow."
        : "No suitable valuation base was found. Withholding a fair-value range protects the analysis from invented precision.";
  const riskLesson = garch
    ? `Conditional volatility is ${(garch.currentVolatility * 100).toFixed(1)}% and persistence is ${garch.persistence.toFixed(2)}. Volatility clustering describes changing uncertainty, not direction.`
    : risk
      ? `Observed annualised volatility is ${(risk.volatility * 100).toFixed(1)}% with a ${(risk.maxDrawdown * 100).toFixed(1)}% maximum drawdown. History describes what happened, not what must happen next.`
      : "The price series is too short for a stable risk reading, so model uncertainty should remain prominent.";
  const takeaways = [
    { icon: <Newspaper />, label: "PUBLIC EVIDENCE", title: analysis.evidenceBalance, text: analysis.sectorSummary },
    { icon: <Target />, label: "BUSINESS TRANSMISSION", title: "A headline matters only through a financial channel.", text: analysis.financialTransmission },
    { icon: <Scale />, label: "VALUATION READING", title: analysis.posture, text: analysis.postureDetail },
    { icon: <Gauge />, label: "MODEL CHOICE", title: opinion.valuationMethod ?? "Valuation withheld", text: modelLesson },
    { icon: <BarChart3 />, label: "RISK READING", title: tailRisk ? `Historical 95% VaR ${(tailRisk.var95 * 100).toFixed(1)}%` : "Tail estimate unavailable", text: riskLesson },
    { icon: <ShieldCheck />, label: "LIMIT AND NEXT TEST", title: "Separate a useful clue from a verified conclusion.", text: `${opinion.unresolvedQuestions[0] ?? "Reconcile important claims to primary evidence."} ${research.coverage.fundamentals ? "Extracted fundamentals should still be reconciled to issuer filings." : "Missing financial inputs should reduce the method, not lower the evidence standard."}` },
  ];
  return (
    <section className="learning-takeaways">
      <header><span>SIX TAKEAWAYS FROM THIS CASE</span><h2>Company-specific lessons generated from the current evidence and model outputs.</h2><p>These are deterministic summaries of this analysis, not generic LLM prose.</p></header>
      <div className="lesson-grid">
        {takeaways.map((item) => (
          <article key={item.label}>{item.icon}<span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p></article>
        ))}
      </div>
    </section>
  );
}

function OpinionHeader({
  research,
  opinion,
  analysis,
  formatMoney,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  analysis: AnalysisSummary;
  formatMoney: (value: number | null) => string;
}) {
  return (
    <div className="opinion-header">
      <div>
        <span>INDEPENDENT EDUCATIONAL OPINION · {research.identity.symbol}</span>
        <h3>{opinion.hypothesisStatus}</h3>
        <p>Model version 1.0 · {research.asOf} · {opinion.coverage} coverage</p>
      </div>
      <div className="opinion-range">
        <small>VALUATION POSTURE · {opinion.valuationMethod ?? "NO FINANCIAL MODEL"}</small>
        <strong>{analysis.posture}</strong>
        <span>{analysis.postureDetail}</span>
        {opinion.modelRange && <i>Model band: {formatMoney(opinion.modelRange.low)}–{formatMoney(opinion.modelRange.high)}</i>}
      </div>
      <div className="opinion-disclosure">
        <ShieldCheck />
        <p>Educational commentary—not a recommended target price, prediction or transaction recommendation.</p>
      </div>
    </div>
  );
}

function FullOpinion({
  research,
  opinion,
  analysis,
  assumptions,
  formatMoney,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  analysis: AnalysisSummary;
  assumptions: ValuationAssumptions;
  formatMoney: (value: number | null) => string;
}) {
  return (
    <article className="full-opinion">
      <header>
        <div><span>LONGVIEW RESEARCH</span><h2>{opinion.title}</h2><p>{opinion.dek}</p></div>
        <aside><strong>{research.identity.symbol}</strong><span>{research.identity.exchange}</span><span>{research.identity.currency}</span><small>{research.asOf}</small></aside>
      </header>

      <section className="opinion-summary-grid">
        <div><small>VALUATION POSTURE</small><strong>{analysis.posture}</strong></div>
        <div><small>MODEL-DERIVED RANGE</small><strong>{opinion.modelRange ? `${formatMoney(opinion.modelRange.low)}–${formatMoney(opinion.modelRange.high)}` : "Withheld"}</strong></div>
        <div><small>IMPLIED FCF GROWTH</small><strong>{opinion.impliedGrowth === null ? "Unavailable" : `${(opinion.impliedGrowth * 100).toFixed(1)}%`}</strong></div>
        <div><small>COVERAGE</small><strong>{opinion.coverage}</strong></div>
      </section>

      <section className="opinion-executive-reading">
        <span>EXECUTIVE INTERPRETATION</span>
        <h3>{analysis.posture}</h3>
        <p>{analysis.postureDetail}</p>
      </section>
      <SectorSynthesis analysis={analysis} />

      <section className="opinion-body-grid">
        <div><span>THESIS</span><p>{opinion.thesis}</p></div>
        <div><span>COUNTER-THESIS</span><p>{opinion.counterThesis}</p></div>
      </section>

      <section className="opinion-conclusion">
        <span>LONGVIEW MODEL OPINION</span>
        <h3>{opinion.modelOpinion}</h3>
      </section>

      <section className="opinion-explainer">
        <header><span>HOW THE CONCLUSION WAS BUILT</span><h3>What the public research and quantitative work each contribute.</h3></header>
        <div>
          <article><small>SECONDARY RESEARCH</small><p>{analysis.researchFinding}</p></article>
          <article><small>QUANTITATIVE RESULT</small><p>{analysis.quantFinding}</p></article>
          <article><small>COMBINED READING</small><p>{analysis.combinedFinding}</p></article>
        </div>
      </section>

      <section className="opinion-methods">
        <header><span>QUANTITATIVE METHOD LEDGER</span><h3>Method, purpose, result and limitation.</h3></header>
        {analysis.methods.map((method) => (
          <article key={method.name}>
            <div><small>{method.strategy}</small><strong>{method.name}</strong></div>
            <p><small>QUESTION</small>{method.question}</p>
            <p><small>RESULT</small>{method.result}</p>
            <p><small>INTERPRETATION</small>{method.interpretation}</p>
            <p><small>LIMITATION</small>{method.limitation}</p>
          </article>
        ))}
      </section>

      <section className="opinion-detail-grid">
        <div><span>VARIABLES TO MONITOR</span><ol>{opinion.variablesToMonitor.map((item) => <li key={item}>{item}</li>)}</ol></div>
        <div><span>UNRESOLVED QUESTIONS</span><ol>{opinion.unresolvedQuestions.map((item) => <li key={item}>{item}</li>)}</ol></div>
      </section>

      <section className="opinion-evidence-explained">
        <header><span>EVIDENCE EXPLAINED</span><h3>What each item contributes to the conclusion.</h3></header>
        {opinion.evidence.map((item) => (
          <article key={item.id}>
            <div><small>{item.layer} · {item.direction}</small><strong>{item.title}</strong></div>
            <p>{item.detail}</p>
            <footer>{item.sourceLabel} · {item.asOf}</footer>
          </article>
        ))}
      </section>

      <section className="opinion-assumptions">
        <span>{opinion.valuationMethod ? "MODEL ASSUMPTIONS" : "MODEL BOUNDARY"}</span>
        {opinion.valuationMethod === "Discounted cash flow" ? (
          <div>
            <p><small>FCF / share</small><strong>{assumptions.fcfPerShare}</strong></p>
            <p><small>Growth</small><strong>{(assumptions.growthRate * 100).toFixed(1)}%</strong></p>
            <p><small>Discount rate</small><strong>{(assumptions.discountRate * 100).toFixed(1)}%</strong></p>
            <p><small>Terminal growth</small><strong>{(assumptions.terminalGrowth * 100).toFixed(1)}%</strong></p>
            <p><small>Forecast years</small><strong>{assumptions.forecastYears}</strong></p>
          </div>
        ) : opinion.valuationMethod === "Earnings-multiple scenario" && opinion.modelRange ? (
          <div>
            <p><small>Reported EPS</small><strong>{assumptions.eps.toFixed(2)}</strong></p>
            <p><small>Low value</small><strong>{formatMoney(opinion.modelRange.low)}</strong></p>
            <p><small>Base value</small><strong>{formatMoney(opinion.modelRange.midpoint)}</strong></p>
            <p><small>High value</small><strong>{formatMoney(opinion.modelRange.high)}</strong></p>
            <p><small>Model</small><strong>P/E scenario</strong></p>
          </div>
        ) : opinion.valuationMethod === "Revenue-multiple scenario" && opinion.modelRange ? (
          <div>
            <p><small>Revenue / share</small><strong>{formatMoney(research.fundamentals.revenuePerShare ?? null)}</strong></p>
            <p><small>Low value</small><strong>{formatMoney(opinion.modelRange.low)}</strong></p>
            <p><small>Base value</small><strong>{formatMoney(opinion.modelRange.midpoint)}</strong></p>
            <p><small>High value</small><strong>{formatMoney(opinion.modelRange.high)}</strong></p>
            <p><small>Model</small><strong>EV / sales scenario</strong></p>
          </div>
        ) : <p className="withheld-explanation">Financial valuation was withheld because model-ready reported cash flow, earnings or suitable business-model inputs were unavailable. Narrative and price-history calculations remain descriptive.</p>}
      </section>

      <section className="opinion-sources">
        <span>SOURCE LEDGER</span>
        {research.sources.map((source) => (
          <a href={source.url} target="_blank" rel="noreferrer" key={`${source.label}-${source.url}`}><strong>{source.label}</strong><i>{source.publisher}</i><small>{source.asOf} · {source.kind}</small></a>
        ))}
      </section>

      <footer>
        <div><strong>INTERESTS</strong><p>No issuer compensation, broker referral, sponsored coverage or model-specific commercial consideration is declared in this hackathon build.</p></div>
        <div><strong>AI USE</strong><p>Deterministic code owns calculations. Gemini is optional and limited to plain-language critique; it does not set canonical inputs or the model range.</p></div>
        <div><strong>NON-RELIANCE</strong><p>This generic educational opinion does not consider any reader&apos;s objectives, finances, holdings or needs and does not recommend a transaction.</p></div>
      </footer>
    </article>
  );
}

function RangeField({ label, value, min, max, step, percent = false, onChange }: { label: string; value: number; min: number; max: number; step: number; percent?: boolean; onChange: (value: number) => void }) {
  return <label className="range-field-new"><span>{label}<strong>{percent ? `${(value * 100).toFixed(1)}%` : value}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function NumberField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (value: number) => void }) {
  return <label className="number-field-new"><span>{label}</span><input type="number" value={value} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>;
}

function EmptyModel({ label = "Model waiting for valid inputs" }: { label?: string }) {
  return <div className="empty-model-new"><CircleHelp /><strong>{label}</strong><p>Longview withholds calculations when the evidence or model conditions are insufficient.</p></div>;
}

function SensitivityMatrix({ assumptions }: { assumptions: ValuationAssumptions }) {
  const growthRates = [-0.04, -0.02, 0, 0.02, 0.04].map((offset) => assumptions.growthRate + offset);
  const discountRates = [-0.02, -0.01, 0, 0.01, 0.02].map((offset) => Math.max(assumptions.terminalGrowth + 0.015, assumptions.discountRate + offset));
  return (
    <div className="sensitivity-matrix-new">
      <header><span>SENSITIVITY MATRIX</span><strong>Growth × discount rate</strong></header>
      <div className="matrix-new">
        <div className="matrix-row-new matrix-head-new"><i /><span>G −4%</span><span>G −2%</span><span>BASE</span><span>G +2%</span><span>G +4%</span></div>
        {discountRates.map((discount, row) => (
          <div className="matrix-row-new" key={discount}>
            <i>R {(discount * 100).toFixed(1)}%</i>
            {growthRates.map((growth, column) => {
              const value = dcfPerShare({ ...assumptions, growthRate: growth, discountRate: discount });
              return <span className={row === 2 && column === 2 ? "base-cell-new" : ""} key={growth}>{value === null ? "—" : value.toFixed(value >= 100 ? 0 : 1)}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
