import { describe, expect, it } from "vitest";
import { analyzeNarrative, buildEducationalOpinion, containsAdviceRequest, coverageLevel, defaultHypothesis } from "../lib/education";
import { sampleResearch } from "../lib/samples";

const assumptions = {
  fcfPerShare: 4.25,
  forecastYears: 5,
  growthRate: 0.22,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  netDebtPerShare: -1.7,
  eps: 4.8,
  targetPe: 34,
};

describe("educational publication controls", () => {
  it("keeps a model-ready sample at full coverage", () => {
    expect(coverageLevel(sampleResearch.NVDA)).toBe("full");
  });

  it("selects an earnings-multiple scenario instead of industrial DCF for the bank sample", () => {
    const opinion = buildEducationalOpinion(sampleResearch["D05.SI"], { ...assumptions, fcfPerShare: 0 }, defaultHypothesis);
    expect(opinion.modelRange).not.toBeNull();
    expect(opinion.valuationMethod).toBe("Earnings-multiple scenario");
    expect(opinion.modelOpinion.toLowerCase()).toContain("earnings-multiple");
  });

  it("selects a revenue-multiple scenario for a pre-profit company with reported sales", () => {
    const research = {
      ...sampleResearch.NVDA,
      fundamentals: {
        ...sampleResearch.NVDA.fundamentals,
        fcfPerShare: undefined,
        eps: undefined,
        revenuePerShare: 1.8,
        revenueGrowth: 0.32,
        netDebtPerShare: -0.4,
      },
    };
    const opinion = buildEducationalOpinion(research, { ...assumptions, fcfPerShare: 0, eps: 0 }, defaultHypothesis);
    expect(opinion.valuationMethod).toBe("Revenue-multiple scenario");
    expect(opinion.modelRange).not.toBeNull();
    expect(opinion.modelOpinion.toLowerCase()).toContain("revenue-multiple");
  });

  it("labels facts, calculations and model opinion separately", () => {
    const opinion = buildEducationalOpinion(sampleResearch.NVDA, assumptions, {
      ...defaultHypothesis,
      hypothesis: "AI demand may remain durable",
    });
    expect(new Set(opinion.evidence.map((item) => item.layer))).toEqual(new Set([
      "Observed fact",
      "Source interpretation",
      "Longview model opinion",
      "Deterministic calculation",
    ]));
  });

  it("recognises transaction and suitability questions", () => {
    expect(containsAdviceRequest("Should I buy this stock?")).toBe(true);
    expect(containsAdviceRequest("I want to understand margin assumptions")).toBe(false);
  });

  it("quantifies a public headline sample without treating it as valuation", () => {
    const narrative = analyzeNarrative([
      { id: "1", title: "Space company wins new government launch contract", publisher: "Publisher A", url: "https://example.com/a", publishedAt: new Date().toISOString(), relatedTickers: [] },
      { id: "2", title: "Launch delay raises execution risk", publisher: "Publisher B", url: "https://example.com/b", publishedAt: new Date().toISOString(), relatedTickers: [] },
      { id: "3", title: "Satellite sector demand expands", publisher: "Publisher A", url: "https://example.com/c", publishedAt: new Date().toISOString(), relatedTickers: [] },
    ], "Launch demand may remain strong");
    expect(narrative.articleCount).toBe(3);
    expect(narrative.publisherCount).toBe(2);
    expect(narrative.supports).toBeGreaterThan(0);
    expect(narrative.challenges).toBeGreaterThan(0);
    expect(narrative.hypothesisMatches).toBeGreaterThan(0);
    expect(narrative.themeEntropy).toBeGreaterThanOrEqual(0);
    expect(narrative.themeEntropy).toBeLessThanOrEqual(1);
  });
});
