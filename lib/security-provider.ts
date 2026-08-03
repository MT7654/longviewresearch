import "server-only";
import type { Fundamentals, PublicArticle, SecurityIdentity, SecurityResearch, SourceRecord } from "./domain";
import { sampleList, sampleResearch } from "./samples";

const headers = { "User-Agent": "LongviewResearch/1.0 educational-project" };
const yahooSearch = "https://query1.finance.yahoo.com/v1/finance/search";

const countryFromTimezone = (timezone?: string) => {
  if (!timezone) return "Unknown";
  if (timezone.includes("Singapore")) return "Singapore";
  if (timezone.includes("Hong_Kong")) return "Hong Kong";
  if (timezone.includes("Tokyo")) return "Japan";
  if (timezone.includes("London")) return "United Kingdom";
  if (timezone.includes("Amsterdam")) return "Netherlands";
  if (timezone.includes("New_York")) return "United States";
  return timezone.split("/")[0].replaceAll("_", " ");
};

const cleanEntityName = (value: string) => value
  .trim()
  .replace(/\s+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const safeUrl = (value: unknown) => {
  try {
    const url = new URL(String(value ?? ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};

export async function fetchPublicArticles(query: string): Promise<PublicArticle[]> {
  try {
    const url = `${yahooSearch}?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=14`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000), next: { revalidate: 1800 } });
    if (!response.ok) return [];
    const json = await response.json() as { news?: Array<Record<string, unknown>> };
    const seen = new Set<string>();
    const exactTicker = query.trim().toUpperCase();
    const terms = query.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((term) => !["corp", "corporation", "company", "technologies", "limited", "holdings"].includes(term)) ?? [];
    return (json.news ?? []).filter((item) => {
      const title = String(item.title ?? "").toLowerCase();
      const related = Array.isArray(item.relatedTickers) ? item.relatedTickers.map((ticker) => String(ticker).toUpperCase()) : [];
      return related.includes(exactTicker) || terms.some((term) => title.includes(term));
    }).flatMap((item, index) => {
      const title = String(item.title ?? "").trim();
      const link = safeUrl(item.link);
      const key = `${title.toLowerCase()}|${link}`;
      if (!title || !link || seen.has(key)) return [];
      seen.add(key);
      const epoch = Number(item.providerPublishTime ?? 0);
      return [{
        id: String(item.uuid ?? `article-${index}`),
        title,
        publisher: String(item.publisher ?? "Public publisher"),
        url: link,
        publishedAt: epoch > 0 ? new Date(epoch * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        relatedTickers: Array.isArray(item.relatedTickers) ? item.relatedTickers.map(String).slice(0, 8) : [],
      }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}

type FundamentalPoint = { asOfDate?: string; reportedValue?: { raw?: number } };
type FundamentalSeries = { meta?: { type?: string[] }; [key: string]: unknown };

export function parseFundamentalSeries(series: FundamentalSeries[]) {
  const values = new Map<string, FundamentalPoint[]>();
  for (const row of series) {
    const type = row.meta?.type?.[0];
    if (!type || !Array.isArray(row[type])) continue;
    values.set(type, (row[type] as FundamentalPoint[]).filter((point) => Number.isFinite(point.reportedValue?.raw)));
  }
  const latestPoint = (type: string) => values.get(type)?.at(-1);
  const latest = (type: string) => latestPoint(type)?.reportedValue?.raw;
  const sumLatest = (type: string, count: number) => {
    const points = values.get(type) ?? [];
    if (points.length < count) return undefined;
    return points.slice(-count).reduce((total, point) => total + (point.reportedValue?.raw ?? 0), 0);
  };
  const shares = latest("annualDilutedAverageShares") ?? latest("quarterlyDilutedAverageShares");
  const freeCashFlow = latest("annualFreeCashFlow") ?? sumLatest("quarterlyFreeCashFlow", 4);
  const annualRevenue = values.get("annualTotalRevenue") ?? [];
  const latestRevenue = annualRevenue.at(-1)?.reportedValue?.raw ?? sumLatest("quarterlyTotalRevenue", 4);
  const previousRevenue = annualRevenue.at(-2)?.reportedValue?.raw ?? (() => {
    const quarterly = values.get("quarterlyTotalRevenue") ?? [];
    if (quarterly.length < 8) return undefined;
    return quarterly.slice(-8, -4).reduce((total, point) => total + (point.reportedValue?.raw ?? 0), 0);
  })();
  const debt = latest("annualTotalDebt") ?? latest("quarterlyTotalDebt") ?? 0;
  const cash =
    latest("annualCashCashEquivalentsAndShortTermInvestments") ??
    latest("quarterlyCashCashEquivalentsAndShortTermInvestments") ??
    latest("annualCashAndCashEquivalents") ??
    latest("quarterlyCashAndCashEquivalents") ??
    0;
  const operatingIncome = latest("annualOperatingIncome") ?? sumLatest("quarterlyOperatingIncome", 4);
  const equity = latest("annualStockholdersEquity") ?? latest("quarterlyStockholdersEquity");
  const investedCapital = debt + (equity ?? 0) - cash;

  const fundamentals: Fundamentals = {};
  if (shares && shares > 0) {
    fundamentals.sharesOutstanding = shares;
    if (freeCashFlow && freeCashFlow > 0) fundamentals.fcfPerShare = freeCashFlow / shares;
    fundamentals.netDebtPerShare = (debt - cash) / shares;
  }
  const eps = latest("annualDilutedEPS") ?? sumLatest("quarterlyDilutedEPS", 4);
  if (eps && eps > 0) fundamentals.eps = eps;
  if (latestRevenue && previousRevenue && previousRevenue > 0) fundamentals.revenueGrowth = latestRevenue / previousRevenue - 1;
  if (operatingIncome && latestRevenue && latestRevenue > 0) fundamentals.operatingMargin = operatingIncome / latestRevenue;
  if (operatingIncome && investedCapital > 0) fundamentals.roic = (operatingIncome * 0.79) / investedCapital;

  const dates = [...values.values()].flatMap((points) => points.map((point) => point.asOfDate ?? "")).filter(Boolean).sort();
  const modelAsOf =
    latestPoint("annualFreeCashFlow")?.asOfDate ??
    latestPoint("quarterlyFreeCashFlow")?.asOfDate ??
    latestPoint("annualDilutedEPS")?.asOfDate ??
    latestPoint("annualTotalRevenue")?.asOfDate ??
    dates.at(-1) ??
    "";
  return { fundamentals, asOf: modelAsOf, modelReady: Boolean(fundamentals.fcfPerShare && fundamentals.eps) };
}

async function fetchPublicFundamentals(symbol: string) {
  const types = [
    "annualFreeCashFlow",
    "annualDilutedEPS",
    "annualTotalRevenue",
    "annualDilutedAverageShares",
    "quarterlyDilutedAverageShares",
    "quarterlyFreeCashFlow",
    "quarterlyDilutedEPS",
    "quarterlyTotalRevenue",
    "annualTotalDebt",
    "quarterlyTotalDebt",
    "annualCashCashEquivalentsAndShortTermInvestments",
    "quarterlyCashCashEquivalentsAndShortTermInvestments",
    "annualCashAndCashEquivalents",
    "quarterlyCashAndCashEquivalents",
    "annualOperatingIncome",
    "quarterlyOperatingIncome",
    "annualStockholdersEquity",
    "quarterlyStockholdersEquity",
  ].join(",");
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const period1 = period2 - 6 * 365 * 86400;
  try {
    const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?symbol=${encodeURIComponent(symbol)}&type=${types}&merge=false&period1=${period1}&period2=${period2}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6500), next: { revalidate: 21600 } });
    if (!response.ok) return { fundamentals: {}, asOf: "", modelReady: false };
    const json = await response.json() as { timeseries?: { result?: FundamentalSeries[] } };
    return parseFundamentalSeries(json.timeseries?.result ?? []);
  } catch {
    return { fundamentals: {}, asOf: "", modelReady: false };
  }
}

const newsSources = (articles: PublicArticle[]): SourceRecord[] => articles.map((article) => ({
  label: article.title,
  publisher: article.publisher,
  url: article.url,
  asOf: article.publishedAt,
  kind: "news" as const,
  tier: "secondary" as const,
  reliability: "medium" as const,
  claim: "Headline-level secondary coverage; open the source before treating it as evidence for a business claim.",
  retrievedAt: new Date().toISOString(),
}));

export async function searchSecurities(query: string) {
  const normalized = query.trim().toLowerCase();
  const local = sampleList
    .filter((item) => `${item.symbol} ${item.name} ${item.exchange} ${item.country}`.toLowerCase().includes(normalized))
    .map((item) => ({ ...item, source: "sample" as const }));
  let remote: Array<{
    symbol: string;
    name: string;
    exchange: string;
    exchangeCode: string;
    country: string;
    currency: string;
    type: string;
    source: "live-search";
  }> = [];
  try {
    const url = `${yahooSearch}?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    if (response.ok) {
      const json = await response.json() as { quotes?: Array<Record<string, unknown>> };
      remote = (json.quotes ?? [])
        .filter((quote) => ["EQUITY", "ADR"].includes(String(quote.quoteType ?? "")))
        .map((quote) => ({
          symbol: String(quote.symbol ?? ""),
          name: String(quote.longname ?? quote.shortname ?? quote.symbol ?? ""),
          exchange: String(quote.exchDisp ?? quote.exchange ?? "Unknown exchange"),
          exchangeCode: String(quote.exchange ?? ""),
          country: "Confirm after loading",
          currency: String(quote.currency ?? "—"),
          type: String(quote.typeDisp ?? quote.quoteType ?? "Equity"),
          source: "live-search" as const,
        }));
    }
  } catch {
    // The public-research fallback below still provides a useful path.
  }
  const seen = new Set<string>();
  const listed = [...local, ...remote].filter((item) => item.symbol && !seen.has(item.symbol) && seen.add(item.symbol)).slice(0, 7);
  return [...listed, {
    symbol: `ENTITY:${query.trim()}`,
    name: cleanEntityName(query),
    exchange: "Public coverage scan",
    exchangeCode: "",
    country: "Global",
    currency: "—",
    type: "Company / topic research",
    source: "public-research" as const,
  }];
}

async function loadEntityResearch(rawName: string): Promise<SecurityResearch> {
  const name = cleanEntityName(rawName);
  const matches = await searchSecurities(name);
  const listed = matches.find((item) => item.source !== "public-research");
  if (listed) return loadSecurity(listed.symbol);
  const articles = await fetchPublicArticles(name);
  return {
    identity: { symbol: "RESEARCH", name, exchange: "No verified listing", country: "Global", currency: "—", type: "Company / public narrative" },
    price: null,
    asOf: `Public coverage scan · ${new Date().toISOString().slice(0, 10)}`,
    mode: "unverified",
    priceHistory: [],
    historyInterval: "daily",
    fundamentals: {},
    articles,
    sources: newsSources(articles),
    coverage: { identity: false, price: false, history: false, fundamentals: false, peers: false, articles: articles.length > 0 },
    note: articles.length
      ? "No exact listed security was selected. Longview is providing a public-coverage lesson and withholding stock valuation."
      : "No exact listed security or current public coverage could be resolved.",
  };
}

export async function loadSecurity(symbol: string): Promise<SecurityResearch> {
  if (symbol.toUpperCase().startsWith("ENTITY:")) return loadEntityResearch(symbol.slice(7));
  const normalized = symbol.trim().toUpperCase();

  if (sampleResearch[normalized]) {
    const sample = sampleResearch[normalized];
    const articles = await fetchPublicArticles(sample.identity.symbol);
    return {
      ...sample,
      historyInterval: "monthly",
      articles,
      sources: [...sample.sources, ...newsSources(articles)],
      coverage: { ...sample.coverage, articles: articles.length > 0 },
    };
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?range=2y&interval=1d&events=div%2Csplits`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(7000), next: { revalidate: 900 } });
    if (!response.ok) throw new Error("Market-data service did not recognise this symbol.");
    const json = await response.json() as {
      chart?: { result?: Array<{
        meta?: Record<string, unknown>;
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>; error?: { description?: string } };
    };
    const result = json.chart?.result?.[0];
    if (!result) throw new Error(json.chart?.error?.description ?? "No chart data was returned.");
    const meta = result.meta ?? {};
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const history = timestamps.flatMap((timestamp, index) => {
      const close = closes[index];
      return typeof close === "number" && Number.isFinite(close)
        ? [{ date: new Date(timestamp * 1000).toISOString().slice(0, 10), close: Number(close.toFixed(4)) }]
        : [];
    });
    const identity: SecurityIdentity = {
      symbol: normalized,
      name: String(meta.longName ?? meta.shortName ?? normalized),
      exchange: String(meta.fullExchangeName ?? meta.exchangeName ?? "Unknown exchange"),
      exchangeCode: String(meta.exchangeName ?? ""),
      country: countryFromTimezone(String(meta.exchangeTimezoneName ?? "")),
      currency: String(meta.currency ?? "—"),
      type: String(meta.instrumentType ?? "Equity"),
      timezone: String(meta.exchangeTimezoneName ?? ""),
    };
    const [fundamentalResult, articles] = await Promise.all([
      fetchPublicFundamentals(normalized),
      fetchPublicArticles(normalized),
    ]);
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : history.at(-1)?.close ?? null;
    const sources: SourceRecord[] = [{
      label: `${identity.name} public chart`,
      publisher: "Yahoo Finance chart service",
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(normalized)}`,
      asOf: history.at(-1)?.date ?? new Date().toISOString().slice(0, 10),
      kind: "market",
      tier: "secondary",
      reliability: "medium",
    }];
    if (Object.keys(fundamentalResult.fundamentals).length) {
      sources.push({
        label: `${identity.name} public fundamental time series`,
        publisher: "Yahoo Finance fundamental time-series service",
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(normalized)}/financials`,
        asOf: fundamentalResult.asOf || new Date().toISOString().slice(0, 10),
        kind: "fundamentals",
        tier: "secondary",
        reliability: "medium",
        claim: "Automatically parsed public financial series; reconcile to the issuer's filing before relying on a model.",
      });
    }
    return {
      identity,
      price,
      previousClose: typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : null,
      asOf: history.at(-1)?.date ? `Public market snapshot · ${history.at(-1)!.date}` : "Public market snapshot",
      mode: "live",
      priceHistory: history,
      historyInterval: "daily",
      fundamentals: fundamentalResult.fundamentals,
      articles,
      sources: [...sources, ...newsSources(articles)],
      coverage: {
        identity: true,
        price: price !== null,
        history: history.length >= 3,
        fundamentals: fundamentalResult.modelReady,
        peers: false,
        articles: articles.length > 0,
      },
      note: fundamentalResult.modelReady
        ? "Public price history, secondary-source financial series and current headline coverage are available."
        : "Public price and headline coverage are available. Valuation is withheld until model-ready reported fundamentals exist.",
    };
  } catch (error) {
    const articles = await fetchPublicArticles(normalized);
    return {
      identity: { symbol: normalized, name: normalized, exchange: "Unverified", country: "Unverified", currency: "—", type: "Unresolved security" },
      price: null,
      asOf: `Public coverage scan · ${new Date().toISOString().slice(0, 10)}`,
      mode: "unverified",
      priceHistory: [],
      historyInterval: "daily",
      fundamentals: {},
      articles,
      sources: newsSources(articles),
      coverage: { identity: false, price: false, history: false, fundamentals: false, peers: false, articles: articles.length > 0 },
      note: articles.length
        ? "The ticker could not be verified, so Longview is showing only attributed public coverage."
        : error instanceof Error ? error.message : "This security could not be resolved.",
    };
  }
}
