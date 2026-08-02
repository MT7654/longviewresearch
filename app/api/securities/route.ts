import { NextResponse } from "next/server";
import { loadSecurity } from "@/lib/security-provider";

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol")?.trim() ?? "";
  if (!/^[A-Za-z0-9.^=_-]{1,32}$/.test(symbol)) {
    return NextResponse.json({ error: "Enter a valid listed-equity symbol." }, { status: 400 });
  }
  return NextResponse.json(await loadSecurity(symbol));
}
