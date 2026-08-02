import { NextResponse } from "next/server";
import { searchSecurities } from "@/lib/security-provider";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 1 || query.length > 80) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: await searchSecurities(query) });
}
