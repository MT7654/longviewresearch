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
  FileDown,
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
  containsAdviceRequest,
  defaultHypothesis,
  learningPrompt,
} from "@/lib/education";
import {
  dcfPerShare,
  factorLens,
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
  methods: Array<{
    name: string;
    strategy: string;
    question: string;
    result: string;
    interpretation: string;
    limitation: string;
  }>;
};

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

  const researchFinding = narrative.articleCount
    ? `${narrative.articleCount} current headlines from ${narrative.publisherCount} publishers concentrate most heavily on ${narrative.dominantTheme.toLowerCase()} (${Math.round(narrative.dominantShare * 100)}% of the sample). The scan maps what the public conversation emphasises; the linked articles still need to be checked against primary evidence.`
    : "The public scan returned too little current coverage to support a narrative conclusion. Absence of headlines is not evidence that the company is low-risk or unimportant.";

  const quantFinding = valuation !== null && range
    ? `A five-year free-cash-flow DCF produces ${money(research, valuation)}, while seeded sensitivity produces a ${money(research, range.low)}–${money(research, range.high)} range. Reverse DCF estimates that the current price requires ${reverseGrowth === null ? "an unresolved" : `${(reverseGrowth * 100).toFixed(1)}% annual`} free-cash-flow growth under the displayed discount and terminal-growth assumptions.`
    : risk
      ? `No defensible financial valuation could be run. The supported market-behaviour model uses ${research.priceHistory.length} ${research.historyInterval ?? "monthly"} observations and measures ${(risk.volatility * 100).toFixed(1)}% annualised volatility with a ${(risk.maxDrawdown * 100).toFixed(1)}% maximum observed drawdown. These are historical descriptors, not fair value.`
      : "Neither model-ready fundamentals nor enough price history were available. Longview limits the quantitative conclusion to coverage and narrative measurements.";

  const combinedFinding = range
    ? `${posture}. Secondary research supplies context and counter-questions; the valuation posture comes only from the deterministic model and its visible assumptions.`
    : `${posture}. The evidence can describe attention and observed market behaviour, but it cannot establish whether the security is overvalued or undervalued.`;

  const methods: AnalysisSummary["methods"] = valuation !== null && range ? [
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

  return { posture, postureDetail, researchFinding, quantFinding, combinedFinding, methods };
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
      ? buildAnalysisSummary(research, opinion, valuation, relative, reverseGrowth, risk, narrative)
      : null,
    [research, opinion, valuation, relative, reverseGrowth, risk, narrative],
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
    const allCorrect = activeQuizItems.every((item, itemIndex) => nextQuiz[itemIndex] === item.correct);
    if (allCorrect) setOpinionUnlocked(true);
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
          analysisMode: valuation === null ? "narrative" : "valuation",
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
        summary: valuation === null
          ? "The optional language tutor is unavailable. The deterministic tutor can still challenge the public narrative and explain why a financial valuation is withheld."
          : "The optional language tutor is unavailable, but the calculation and learning path remain complete.",
        pressurePoints: valuation === null ? [
          `${narrative.articleCount} sampled headlines are secondary evidence, not verified operating facts.`,
          `${narrative.publisherCount} publishers may still repeat the same underlying story.`,
          "Reported model-ready cash flows are required before a DCF can be interpreted.",
        ] : [
          "Reconcile free cash flow per share to a dated source.",
          "Test a wider discount-rate range.",
          "Check whether terminal value dominates the result.",
        ],
        lesson: valuation === null
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
        <button
          type="button"
          className="text-button"
          disabled={!opinionUnlocked}
          onClick={() => window.print()}
          title={opinionUnlocked ? "Print or save the complete opinion as PDF" : "Complete the education debrief to unlock export"}
        >
          {opinionUnlocked ? <FileDown /> : <LockKeyhole />} Export opinion
        </button>
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
              title={valuation !== null ? "Map market expectations" : "Map the public narrative"}
              detail={valuation !== null ? "Use reverse DCF to solve for growth implied by price and assumptions." : "Group current headlines by sector, capital, execution, policy and competition themes."}
              learning={valuation !== null ? "Price is not the same as value" : "Attention is not the same as evidence"}
            />
            <RoadmapCard
              number="04"
              icon={<FlaskConical />}
              title={valuation !== null ? "Stress the model" : "Measure what the data supports"}
              detail={valuation !== null ? "Run scenarios, systematic factor proxies and reproducible uncertainty." : "Calculate source diversity, theme entropy and available price-history risk without inventing fundamentals."}
              learning={valuation !== null ? "Ranges before false precision" : "Use a smaller method when evidence is smaller"}
            />
            <RoadmapCard number="05" icon={<BookOpen />} title="Publish and reflect" detail="Separate facts, calculations, interpretation and Longview's model opinion." learning="Understand before exporting" />
          </div>
          <InstitutionalLens
            institutional="An analyst defines the question, establishes an evidence hierarchy and chooses methods that fit the business before interpreting results."
            plain="Longview will not force every company through the same formula or quietly fill missing data."
            limitation={valuation !== null ? "Automatic public financial series should be reconciled to issuer filings before interpretation." : "This path can map public coverage and market behaviour, but financial valuation remains withheld until reported inputs exist."}
          />
          <StageContinue label="Continue to the evidence desk" onClick={() => advance(2)} />
        </StageShell>
      )}

      {activeStage === 2 && (
        <StageShell
          eyebrow="03 / EVIDENCE DESK"
          title="Separate evidence from narrative."
          intro="Each item is labelled by what it is, where it came from and whether it supports, challenges or limits the opening idea."
        >
          <HypothesisLedger profile={profile} opinion={opinion} />
          <NarrativeBriefing narrative={narrative} articles={research.articles ?? []} />
          <div className="evidence-grid">
            {opinion.evidence.map((item) => (
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
          <div className="source-hierarchy">
            <div><strong>PRIMARY</strong><span>Filings, company disclosures and official data</span><i>Highest evidentiary weight</i></div>
            <div><strong>SECONDARY</strong><span>Public market data and reputable contextual sources</span><i>Useful with attribution</i></div>
            <div><strong>DEMONSTRATION</strong><span>Frozen hackathon cases with explicit timestamps</span><i>Reliable demo, not current data</i></div>
          </div>
          <InstitutionalLens
            institutional="A professional research process keeps supporting and contradictory evidence in the same ledger."
            plain="A convincing story is not enough. The difficult evidence often teaches more than the comfortable evidence."
            limitation={research.coverage.fundamentals
              ? "Public financial series are automatically parsed but should still be reconciled to issuer filings."
              : "The public coverage scan is useful for macro context, but headline evidence cannot substitute for reported financials."}
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
          <QuantMethodGuide analysis={analysis} />
          <div className="quant-readout-grid">
            {valuation !== null ? <>
              <QuantReadout label="Market-implied FCF growth" value={reverseGrowth === null ? "Unavailable" : `${(reverseGrowth * 100).toFixed(1)}%`} detail="Solved backwards from the reference price" tone="lime" />
              <QuantReadout label="Scenario DCF" value={formatMoney(valuation)} detail="Mechanical result under displayed defaults" tone="blue" />
              <QuantReadout label="Model distribution" value={`${formatMoney(simulation.p10)}–${formatMoney(simulation.p90)}`} detail="P10–P90 across seeded assumptions" tone="amber" />
              <QuantReadout label="Relative comparison" value={formatMoney(relative)} detail={`${assumptions.targetPe.toFixed(1)}× comparison multiple`} tone="white" />
            </> : <>
              <QuantReadout label="Public coverage sample" value={`${narrative.articleCount}`} detail={`Headlines from ${narrative.publisherCount} publishers`} tone="lime" />
              <QuantReadout label="Source diversity" value={`${Math.round(narrative.sourceDiversity * 100)}%`} detail="Distinct publishers divided by sampled headlines" tone="blue" />
              <QuantReadout label="Theme entropy" value={narrative.articleCount ? narrative.themeEntropy.toFixed(2) : "No sample"} detail="0 = concentrated · 1 = evenly distributed" tone="amber" />
              <QuantReadout label="History depth" value={`${research.priceHistory.length}`} detail={`${research.historyInterval ?? "monthly"} price observations`} tone="white" />
            </>}
          </div>

          <div className="quant-chart-grid">
            {valuation !== null ? (
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

          {valuation !== null ? (
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

          <div className="tutor-panel">
            <BrainCircuit />
            <div>
              <small>OPTIONAL QUANT TUTOR</small>
              <strong>Ask for a plain-English evidence and model challenge.</strong>
              <p>Gemini receives only the public headline map and non-personal analytical inputs. A deterministic critique remains available when the free tier is limited.</p>
            </div>
            <button type="button" disabled={tutorLoading} onClick={askTutor}>
              {tutorLoading ? <><LoaderCircle className="spin" /> Working…</> : <><Sparkles /> Challenge the model</>}
            </button>
          </div>
          {tutor && (
            <div className="tutor-response">
              <small>{tutor.mode === "gemini" ? `GEMINI · ${tutor.model}` : "DETERMINISTIC TUTOR"}</small>
              <h3>{tutor.summary}</h3>
              <ul>{tutor.pressurePoints.map((point) => <li key={point}>{point}</li>)}</ul>
              <p><BookOpen /> {tutor.lesson}</p>
            </div>
          )}

          <InstitutionalLens
            institutional="Quant researchers use multiple models because every method answers a narrower question and carries different failure modes."
            plain={valuation !== null ? "The range is useful because it shows how quickly the answer changes when assumptions move." : "When financial inputs are missing, quant work can still measure source breadth, topic concentration and observed price behaviour."}
            limitation={valuation !== null ? "Factor scores are transparent educational proxies, not licensed institutional signals or a complete factor regression." : "Headline classification is a research triage tool. It is not sentiment truth, a company fundamental or a trading signal."}
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
          <OpinionHeader research={research} opinion={opinion} analysis={analysis} formatMoney={formatMoney} />
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

          {!opinionUnlocked ? (
            <div className="opinion-lock">
              <LockKeyhole />
              <div>
                <small>COMPLETE RATIONALE LOCKED</small>
                <h3>Understand the method before exporting the opinion.</h3>
                <p>Risks, limitations and the headline model view remain visible. Complete three short learning checks to unlock the source ledger, full rationale and PDF-ready version.</p>
              </div>
              <button type="button" onClick={() => advance(5)}>Begin education debrief <ArrowRight /></button>
            </div>
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

          <div className="lesson-grid">
            {valuation !== null ? <>
              <article><Gauge /><span>EXPECTATIONS</span><h3>Price can be translated into assumptions.</h3><p>Reverse DCF asks what must be true without claiming that it will become true.</p></article>
              <article><Scale /><span>VALUATION</span><h3>Business quality and price are different questions.</h3><p>Strong evidence about a company can coexist with demanding expectations.</p></article>
              <article><BarChart3 /><span>UNCERTAINTY</span><h3>A range is more honest than false precision.</h3><p>Model disagreement reveals where judgement and missing information matter.</p></article>
            </> : <>
              <article><Newspaper /><span>PUBLIC NARRATIVE</span><h3>Headlines generate questions, not facts.</h3><p>Open the underlying source and trace important claims back to primary evidence.</p></article>
              <article><BarChart3 /><span>INFORMATION ENTROPY</span><h3>Concentration can be measured without calling it truth.</h3><p>Theme entropy describes whether attention is narrow or dispersed across the sampled coverage.</p></article>
              <article><ShieldCheck /><span>MODEL BOUNDARY</span><h3>Withholding a valuation is an analytical result.</h3><p>The absence of reported inputs should reduce the method, not lower the evidence standard.</p></article>
            </>}
          </div>

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
            <div className={score === activeQuizItems.length ? "unlock-banner unlocked" : "unlock-banner"}>
              {score === activeQuizItems.length ? <CheckCircle2 /> : <CircleHelp />}
              <div>
                <small>{score}/3 CONCEPTS UNDERSTOOD</small>
                <h3>{score === activeQuizItems.length ? "The complete Educational Opinion Piece is unlocked." : "Revisit the highlighted explanations and try again."}</h3>
              </div>
              {score === activeQuizItems.length && <button type="button" onClick={() => advance(4)}>Read and export the complete opinion <ArrowRight /></button>}
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

      {opinionUnlocked && (
        <div className="print-opinion">
          <FullOpinion research={research} opinion={opinion} analysis={analysis} assumptions={assumptions} formatMoney={formatMoney} print />
        </div>
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

function DebriefFindings({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <section className="debrief-findings">
      <header><span>WHAT THE ANALYSIS ACTUALLY FOUND</span><h2>Research context, quantitative result, combined interpretation.</h2></header>
      <div>
        <article><Newspaper /><span>SECONDARY RESEARCH</span><p>{analysis.researchFinding}</p></article>
        <article><Binary /><span>QUANTITATIVE RESULT</span><p>{analysis.quantFinding}</p></article>
        <article><Scale /><span>COMBINED READING</span><h3>{analysis.posture}</h3><p>{analysis.combinedFinding}</p></article>
      </div>
    </section>
  );
}

function QuantReadout({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "lime" | "blue" | "amber" | "white" }) {
  return <article className={`quant-readout tone-${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
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
        <small>VALUATION POSTURE</small>
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
  print = false,
}: {
  research: SecurityResearch;
  opinion: EducationalOpinion;
  analysis: AnalysisSummary;
  assumptions: ValuationAssumptions;
  formatMoney: (value: number | null) => string;
  print?: boolean;
}) {
  return (
    <article className={`full-opinion ${print ? "full-opinion-print" : ""}`}>
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
        <span>{opinion.modelRange ? "MODEL ASSUMPTIONS" : "MODEL BOUNDARY"}</span>
        {opinion.modelRange ? (
          <div>
            <p><small>FCF / share</small><strong>{assumptions.fcfPerShare}</strong></p>
            <p><small>Growth</small><strong>{(assumptions.growthRate * 100).toFixed(1)}%</strong></p>
            <p><small>Discount rate</small><strong>{(assumptions.discountRate * 100).toFixed(1)}%</strong></p>
            <p><small>Terminal growth</small><strong>{(assumptions.terminalGrowth * 100).toFixed(1)}%</strong></p>
            <p><small>Forecast years</small><strong>{assumptions.forecastYears}</strong></p>
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
