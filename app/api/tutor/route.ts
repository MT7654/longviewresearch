import { NextResponse } from "next/server";
import { z } from "zod";
import { challengeValuation } from "@/lib/gemini";

const requestSchema = z.object({
  symbol: z.string().max(32),
  price: z.number().nonnegative().nullable(),
  dcfValue: z.number().nonnegative().nullable(),
  growthRate: z.number().min(-0.5).max(1),
  discountRate: z.number().min(0).max(1),
  terminalGrowth: z.number().min(-0.2).max(0.2),
  fcfPerShare: z.number().nonnegative(),
  coverage: z.record(z.boolean()),
  analysisMode: z.enum(["valuation", "narrative"]),
  company: z.string().max(160),
  articleCount: z.number().int().min(0).max(20),
  publisherCount: z.number().int().min(0).max(20),
  dominantTheme: z.string().max(80),
  themeEntropy: z.number().min(0).max(1),
  headlines: z.array(z.object({
    title: z.string().max(240),
    publisher: z.string().max(100),
    publishedAt: z.string().max(20),
  })).max(8),
  historyObservations: z.number().int().min(0).max(5000),
  historyInterval: z.enum(["daily", "monthly"]).optional(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    return NextResponse.json(await challengeValuation(input));
  } catch {
    return NextResponse.json({ error: "The valuation challenge could not be prepared." }, { status: 400 });
  }
}
