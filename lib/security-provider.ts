import "server-only";
import type { SecurityIdentity, SecurityResearch } from "./domain";
import { sampleList, sampleResearch } from "./samples";

const headers = { "User-Agent": "LongviewResearch/1.0 educational-project" };

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

export async function searchSecurities(query: string) {
  const normalized = query.trim().toLowerCase();
  const local = sampleList
    .filter((item) => `${item.symbol} ${item.name} ${item.exchange} ${item.country}`.toLowerCase().includes(normalized))
    .map((item) => ({ ...item, source: "sample" as const }));
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    if (!response.ok) return local;
    const json = await response.json() as { quotes?: Array<Record<string, unknown>> };
    const remote = (json.quotes ?? [])
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
    const seen = new Set<string>();
    return [...local, ...remote].filter((item) => item.symbol && !seen.has(item.symbol) && seen.add(item.symbol)).slice(0, 8);
  } catch {
    return local;
  }
}

export async function loadSecurity(symbol: string): Promise<SecurityResearch> {
  const normalized = symbol.trim().toUpperCase();
  if (sampleResearch[normalized]) return sampleResearch[normalized];
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?range=5y&interval=1mo&events=div%2Csplits`;
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
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : history.at(-1)?.close ?? null;
    return {
      identity,
      price,
      previousClose: typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : null,
      asOf: history.at(-1)?.date ? `Public chart snapshot · ${history.at(-1)!.date}` : "Public chart snapshot",
      mode: "live",
      priceHistory: history,
      fundamentals: {},
      sources: [{
        label: `${identity.name} public chart`,
        publisher: "Yahoo Finance chart service",
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(normalized)}`,
        asOf: history.at(-1)?.date ?? new Date().toISOString().slice(0, 10),
        kind: "market",
      }],
      coverage: { identity: true, price: price !== null, history: history.length >= 13, fundamentals: false, peers: false },
      note: "Live public price history is available. Enter sourced per-share fundamentals to unlock the valuation models.",
    };
  } catch (error) {
    return {
      identity: { symbol: normalized, name: normalized, exchange: "Unverified", country: "Unverified", currency: "—", type: "Equity symbol" },
      price: null,
      asOf: "No live data",
      mode: "unverified",
      priceHistory: [],
      fundamentals: {},
      sources: [],
      coverage: { identity: false, price: false, history: false, fundamentals: false, peers: false },
      note: error instanceof Error ? error.message : "This security could not be resolved.",
    };
  }
}
