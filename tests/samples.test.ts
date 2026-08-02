import { describe, expect, it } from "vitest";
import { sampleResearch } from "../lib/samples";

describe("global sample cases", () => {
  it("cover four currencies and exchanges", () => {
    expect(new Set(Object.values(sampleResearch).map((item) => item.identity.currency)).size).toBe(4);
    expect(new Set(Object.values(sampleResearch).map((item) => item.identity.exchange)).size).toBe(4);
  });

  it("label every sample as frozen demonstration data", () => {
    for (const sample of Object.values(sampleResearch)) {
      expect(sample.mode).toBe("sample");
      expect(sample.note?.toLowerCase()).toMatch(/illustrative|disabled/);
      expect(sample.sources.some((source) => source.kind === "demo")).toBe(true);
    }
  });

  it("does not enable generic FCF valuation for the bank sample", () => {
    expect(sampleResearch["D05.SI"].coverage.fundamentals).toBe(false);
    expect(sampleResearch["D05.SI"].fundamentals.fcfPerShare).toBeUndefined();
  });
});
