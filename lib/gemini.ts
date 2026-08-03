import "server-only";
import { GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";
import { z } from "zod";
import type { TutorResponse } from "./domain";

const responseSchema = z.object({
  summary: z.string().min(20).max(900),
  pressurePoints: z.array(z.string().min(8).max(240)).min(2).max(4),
  lesson: z.string().min(20).max(700),
});

const cache = new Map<string, TutorResponse>();
let cooldownUntil = 0;

const primaryModel = process.env.GEMINI_PRIMARY_MODEL || "gemini-3.5-flash-lite";
const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.1-flash-lite")
  .split(",").map((value) => value.trim()).filter(Boolean);

const deterministicTutor = (input: Record<string, unknown>): TutorResponse => {
  const narrativeMode = input.analysisMode === "narrative";
  const growth = Number(input.growthRate ?? 0);
  const discount = Number(input.discountRate ?? 0);
  const terminal = Number(input.terminalGrowth ?? 0);
  if (narrativeMode) {
    const articleCount = Number(input.articleCount ?? 0);
    const publisherCount = Number(input.publisherCount ?? 0);
    const dominantTheme = String(input.dominantTheme ?? "the dominant public narrative");
    const entropy = Number(input.themeEntropy ?? 0);
    return {
      mode: "deterministic",
      summary: `This is a public-narrative and market-behaviour analysis, not a financial valuation. The scan contains ${articleCount} headlines from ${publisherCount} publishers, with the strongest concentration in ${dominantTheme.toLowerCase()}.`,
      pressurePoints: [
        `${publisherCount} publishers do not necessarily represent ${publisherCount} independent underlying sources; syndicated narratives can create false breadth.`,
        `A theme-entropy score of ${entropy.toFixed(2)} measures headline dispersion, not business quality or future returns.`,
        "Reported free cash flow, share count and balance-sheet data are still required before a DCF range can be interpreted.",
      ],
      lesson: "Institutional researchers use headlines to find questions and primary documents. They do not turn headline volume or tone directly into a valuation.",
    };
  }
  return {
    mode: "deterministic",
    summary: "This valuation is an assumption map, not a forecast. Its range shows how sensitive the model is to cash-flow growth and the return demanded by investors.",
    pressurePoints: [
      `A ${(growth * 100).toFixed(1)}% growth assumption compounds through every forecast year, so small changes can move value materially.`,
      `The ${(discount * 100).toFixed(1)}% discount rate is only ${(Math.max(0, discount - terminal) * 100).toFixed(1)} points above terminal growth; a narrow spread increases terminal-value sensitivity.`,
      "Free cash flow per share should be reconciled to a dated filing before this model is interpreted.",
    ],
    lesson: "Professionals challenge a valuation by changing one assumption at a time, checking the source behind each input, and asking whether the terminal value dominates the result.",
  };
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function challengeValuation(input: Record<string, unknown>): Promise<TutorResponse> {
  if (!process.env.GOOGLE_API_KEY || Date.now() < cooldownUntil) return deterministicTutor(input);
  const key = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const cached = cache.get(key);
  if (cached) return cached;
  const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const models = [primaryModel, ...fallbackModels.filter((model) => model !== primaryModel)];
  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: `Challenge this educational equity analysis without recommending any investment action. If financial inputs are missing, critique the public narrative, source diversity and data boundary instead of asking for a DCF result. Distinguish headline metadata, assumptions, calculations and facts. Input: ${JSON.stringify(input)}`,
          config: {
            systemInstruction: "You are Longview's Quant Tutor. Return compact JSON only. Explain what the available evidence can and cannot establish. Do not say buy, sell, hold, invest, avoid, suitable, or target price.",
            responseMimeType: "application/json",
            maxOutputTokens: 900,
          },
        });
        const parsed = responseSchema.parse(JSON.parse(response.text ?? "{}"));
        const result = { mode: "gemini" as const, model, ...parsed };
        cache.set(key, result);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const rateLimited = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(message);
        const transient = rateLimited || /503|UNAVAILABLE|timeout/i.test(message);
        if (!transient) break;
        if (attempt === 0) await wait(450 + modelIndex * 250);
        if (rateLimited) cooldownUntil = Date.now() + 30_000;
      }
    }
  }
  return deterministicTutor(input);
}
