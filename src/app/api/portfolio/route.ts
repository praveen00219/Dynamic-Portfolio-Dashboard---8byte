import { NextResponse } from "next/server";
import { buildPortfolio } from "@/lib/portfolio";

// GET /api/portfolio — polled every 15s; all upstream access happens server-side so nothing leaks to the client and the cache is shared by all visitors.

export const runtime = "nodejs"; // cheerio + yahoo-finance2 need Node, not Edge
export const dynamic = "force-dynamic"; // never pre-render; data is live

export async function GET() {
  try {
    const portfolio = await buildPortfolio();
    return NextResponse.json(portfolio, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/portfolio] failed to build portfolio:", err);
    return NextResponse.json(
      { error: "Failed to fetch portfolio data. Please try again shortly." },
      { status: 502 },
    );
  }
}