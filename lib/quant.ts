import type { PricePoint, ValuationAssumptions } from "./domain";

export function dcfPerShare(input: Pick<ValuationAssumptions, "fcfPerShare" | "forecastYears" | "growthRate" | "discountRate" | "terminalGrowth" | "netDebtPerShare">) {
  const { fcfPerShare, forecastYears, growthRate, discountRate, terminalGrowth, netDebtPerShare } = input;
  if (fcfPerShare <= 0 || forecastYears < 1 || discountRate <= terminalGrowth) return null;
  let value = 0;
  let fcf = fcfPerShare;
  for (let year = 1; year <= forecastYears; year++) {
    fcf *= 1 + growthRate;
    value += fcf / (1 + discountRate) ** year;
  }
  const terminal = (fcf * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  return value + terminal / (1 + discountRate) ** forecastYears - netDebtPerShare;
}

export function reverseDcfGrowth(price: number, input: Omit<ValuationAssumptions, "growthRate" | "eps" | "targetPe">) {
  let low = -0.3;
  let high = 0.8;
  for (let iteration = 0; iteration < 80; iteration++) {
    const mid = (low + high) / 2;
    const value = dcfPerShare({ ...input, growthRate: mid });
    if (value === null) return null;
    if (value < price) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function relativeValue(eps: number, targetPe: number) {
  return eps > 0 && targetPe > 0 ? eps * targetPe : null;
}

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function normal(random: () => number) {
  const u = Math.max(random(), 1e-9);
  const v = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function monteCarloValuation(input: ValuationAssumptions, runs = 1600, seed = 7654) {
  const random = rng(seed);
  const values: number[] = [];
  for (let index = 0; index < runs; index++) {
    const growth = Math.max(-0.25, Math.min(0.6, input.growthRate + normal(random) * 0.045));
    const discount = Math.max(0.055, input.discountRate + normal(random) * 0.012);
    const terminal = Math.max(0, Math.min(discount - 0.012, input.terminalGrowth + normal(random) * 0.007));
    const fcf = Math.max(0.01, input.fcfPerShare * (1 + normal(random) * 0.09));
    const result = dcfPerShare({ ...input, fcfPerShare: fcf, growthRate: growth, discountRate: discount, terminalGrowth: terminal });
    if (result !== null && Number.isFinite(result) && result > 0) values.push(result);
  }
  values.sort((a, b) => a - b);
  const percentile = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0;
  const buckets = Array.from({ length: 18 }, (_, index) => {
    const min = percentile(0.02);
    const max = percentile(0.98);
    const step = (max - min) / 18 || 1;
    const from = min + index * step;
    const to = from + step;
    return { label: `${Math.round(from)}`, from, to, count: values.filter((value) => value >= from && (index === 17 ? value <= to : value < to)).length };
  });
  return { p10: percentile(0.1), median: percentile(0.5), p90: percentile(0.9), values, buckets };
}

export function priceReturns(series: PricePoint[]) {
  return series.slice(1).map((point, index) => point.close / series[index].close - 1).filter(Number.isFinite);
}

export function riskMetrics(series: PricePoint[], periodsPerYear = 12) {
  if (series.length < 3) return null;
  const periodic = priceReturns(series);
  const mean = periodic.reduce((sum, value) => sum + value, 0) / periodic.length;
  const variance = periodic.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, periodic.length - 1);
  let peak = series[0].close;
  let drawdown = 0;
  for (const point of series) {
    peak = Math.max(peak, point.close);
    drawdown = Math.min(drawdown, point.close / peak - 1);
  }
  const annualReturn = (1 + mean) ** periodsPerYear - 1;
  const volatility = Math.sqrt(variance * periodsPerYear);
  const lookback = Math.min(periodsPerYear, series.length - 1);
  const skip = periodsPerYear > 50 && series.length > 22 ? 21 : 1;
  const end = series[Math.max(0, series.length - 1 - skip)];
  const start = series[Math.max(0, series.length - 1 - lookback)];
  const momentum = start?.close && end?.close ? end.close / start.close - 1 : 0;
  return { annualReturn, volatility, sharpe: volatility ? annualReturn / volatility : 0, maxDrawdown: drawdown, momentum };
}

function percentile(sorted: number[], probability: number) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + (sorted[lower + 1] ?? sorted[lower]) * weight;
}

export function historicalTailRisk(series: PricePoint[]) {
  const periodic = priceReturns(series);
  if (periodic.length < 20) return null;
  const sorted = [...periodic].sort((a, b) => a - b);
  const cutoff95 = percentile(sorted, 0.05);
  const cutoff99 = percentile(sorted, 0.01);
  const tail95 = sorted.filter((value) => value <= cutoff95);
  return {
    observations: periodic.length,
    var95: Math.max(0, -cutoff95),
    var99: Math.max(0, -cutoff99),
    expectedShortfall95: Math.max(0, -(tail95.reduce((sum, value) => sum + value, 0) / Math.max(1, tail95.length))),
  };
}

export function garch11(series: PricePoint[], periodsPerYear = 252) {
  const periodic = priceReturns(series);
  if (periodic.length < 40) return null;
  const mean = periodic.reduce((sum, value) => sum + value, 0) / periodic.length;
  const residuals = periodic.map((value) => value - mean);
  const unconditionalVariance = residuals.reduce((sum, value) => sum + value ** 2, 0) / periodic.length;
  if (!Number.isFinite(unconditionalVariance) || unconditionalVariance <= 0) return null;

  let best: { alpha: number; beta: number; omega: number; variance: number; score: number } | null = null;
  for (let alpha = 0.03; alpha <= 0.2; alpha += 0.01) {
    for (let beta = 0.7; beta <= 0.96; beta += 0.01) {
      if (alpha + beta >= 0.995) continue;
      const omega = unconditionalVariance * (1 - alpha - beta);
      let variance = unconditionalVariance;
      let score = 0;
      for (let index = 1; index < residuals.length; index++) {
        variance = omega + alpha * residuals[index - 1] ** 2 + beta * variance;
        score += Math.log(variance) + residuals[index] ** 2 / variance;
      }
      if (!best || score < best.score) best = { alpha, beta, omega, variance, score };
    }
  }
  if (!best) return null;

  const nextVariance = best.omega + best.alpha * residuals.at(-1)! ** 2 + best.beta * best.variance;
  let forecastVariance = nextVariance;
  let averageVariance = 0;
  for (let day = 0; day < 20; day++) {
    averageVariance += forecastVariance;
    forecastVariance = best.omega + (best.alpha + best.beta) * forecastVariance;
  }
  averageVariance /= 20;
  return {
    alpha: best.alpha,
    beta: best.beta,
    persistence: best.alpha + best.beta,
    currentVolatility: Math.sqrt(nextVariance * periodsPerYear),
    forecast20DayVolatility: Math.sqrt(averageVariance * periodsPerYear),
    observations: periodic.length,
  };
}

export function monteCarloMarketRisk(
  series: PricePoint[],
  periodsPerYear = 252,
  horizonPeriods = 10,
  runs = 5000,
  seed = 7654,
) {
  const periodic = priceReturns(series);
  if (periodic.length < 20) return null;
  const mean = periodic.reduce((sum, value) => sum + value, 0) / periodic.length;
  const garch = garch11(series, periodsPerYear);
  const sampleVariance = periodic.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, periodic.length - 1);
  const dailyVolatility = garch ? garch.currentVolatility / Math.sqrt(periodsPerYear) : Math.sqrt(sampleVariance);
  const random = rng(seed);
  const outcomes = Array.from({ length: runs }, () => {
    let compounded = 1;
    for (let period = 0; period < horizonPeriods; period++) {
      compounded *= 1 + normal(random) * dailyVolatility;
    }
    return compounded - 1;
  }).sort((a, b) => a - b);
  return {
    horizonPeriods,
    observations: periodic.length,
    medianReturn: percentile(outcomes, 0.5),
    var95: Math.max(0, -percentile(outcomes, 0.05)),
    var99: Math.max(0, -percentile(outcomes, 0.01)),
    p05Return: percentile(outcomes, 0.05),
    p95Return: percentile(outcomes, 0.95),
  };
}

export function factorLens(price: number | null, assumptions: ValuationAssumptions, roic = 0, operatingMargin = 0, history: PricePoint[], periodsPerYear = 12) {
  const risk = riskMetrics(history, periodsPerYear);
  const earningsYield = price && assumptions.eps > 0 ? assumptions.eps / price : 0;
  const fcfYield = price && assumptions.fcfPerShare > 0 ? assumptions.fcfPerShare / price : 0;
  const leveragePenalty = Math.max(0, assumptions.netDebtPerShare) / Math.max(assumptions.fcfPerShare, 0.01);
  return [
    { label: "Value", score: clamp((earningsYield + fcfYield) * 550 - 25), detail: "Earnings and free-cash-flow yield" },
    { label: "Quality", score: clamp(roic * 120 + operatingMargin * 70 - leveragePenalty * 4), detail: "ROIC, margin and balance-sheet proxy" },
    { label: "Momentum", score: clamp(((risk?.momentum ?? 0) + 0.25) * 120), detail: periodsPerYear > 50 ? "Available-history price momentum proxy" : "12–1 month price momentum proxy" },
    { label: "Low volatility", score: clamp(85 - (risk?.volatility ?? 0.45) * 100), detail: "Inverse realised volatility" },
  ];
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
