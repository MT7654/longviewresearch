import { describe, expect, it } from "vitest";
import { dcfPerShare, monteCarloValuation, relativeValue, reverseDcfGrowth, riskMetrics } from "../lib/quant";

const assumptions = {
  fcfPerShare: 5,
  forecastYears: 5,
  growthRate: 0.12,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  netDebtPerShare: 1,
  eps: 4,
  targetPe: 25,
};

describe("deterministic valuation engine", () => {
  it("returns the same value for the same inputs", () => {
    expect(dcfPerShare(assumptions)).toBe(dcfPerShare(assumptions));
  });

  it("rejects a discount rate at or below terminal growth", () => {
    expect(dcfPerShare({ ...assumptions, discountRate: 0.03 })).toBeNull();
  });

  it("recovers a growth rate from its own DCF price", () => {
    const price = dcfPerShare(assumptions)!;
    expect(reverseDcfGrowth(price, assumptions)).toBeCloseTo(assumptions.growthRate, 5);
  });

  it("calculates relative value from entered EPS and multiple", () => {
    expect(relativeValue(4, 25)).toBe(100);
    expect(relativeValue(0, 25)).toBeNull();
  });

  it("produces reproducible ordered Monte Carlo percentiles", () => {
    const first = monteCarloValuation(assumptions, 500, 42);
    const second = monteCarloValuation(assumptions, 500, 42);
    expect(first).toEqual(second);
    expect(first.p10).toBeLessThan(first.median);
    expect(first.median).toBeLessThan(first.p90);
  });
});

describe("historical risk metrics", () => {
  it("measures drawdown from peak to trough", () => {
    const result = riskMetrics([
      { date: "2025-01-01", close: 100 },
      { date: "2025-02-01", close: 120 },
      { date: "2025-03-01", close: 60 },
      { date: "2025-04-01", close: 90 },
    ]);
    expect(result?.maxDrawdown).toBeCloseTo(-0.5);
  });
});
