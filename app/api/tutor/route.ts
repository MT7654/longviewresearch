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
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    return NextResponse.json(await challengeValuation(input));
  } catch {
    return NextResponse.json({ error: "The valuation challenge could not be prepared." }, { status: 400 });
  }
}
