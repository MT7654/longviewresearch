import { describe, expect, it } from "vitest";
import { buildEducationalOpinion, containsAdviceRequest, coverageLevel, defaultHypothesis } from "../lib/education";
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

  it("withholds a generic model range for the bank sample", () => {
    const opinion = buildEducationalOpinion(sampleResearch["D05.SI"], { ...assumptions, fcfPerShare: 0 }, defaultHypothesis);
    expect(opinion.modelRange).toBeNull();
    expect(opinion.modelOpinion.toLowerCase()).toContain("bank");
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
});
