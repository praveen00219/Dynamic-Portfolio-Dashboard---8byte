import YahooFinance from "yahoo-finance2";

// Yahoo Finance adapter (source of truth for CMP) via the unofficial `yahoo-finance2` library; also carries trailing P/E/EPS as a Google Finance fallback.

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface YahooQuote {
  cmp: number | null;
  peRatio: number | null;
  eps: number | null;
}

type QuoteLike = {
  symbol?: string;
  regularMarketPrice?: number;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

// Fetch quotes for all symbols in a single batched call.
export async function fetchYahooQuotes(
  symbols: string[],
): Promise<Record<string, YahooQuote>> {
  let results: QuoteLike[];
  try {
    results = (await yahoo.quote(symbols)) as QuoteLike[];
  } catch (err) {
    // Schema validation on exotic BSE symbols can throw, but the raw result still rides on the error object.
    const failed = err as { result?: QuoteLike[] };
    if (Array.isArray(failed?.result)) results = failed.result;
    else throw err;
  }

  const map: Record<string, YahooQuote> = {};
  for (const q of results ?? []) {
    if (!q?.symbol) continue;
    map[q.symbol] = {
      cmp: num(q.regularMarketPrice),
      peRatio: num(q.trailingPE),
      eps: num(q.epsTrailingTwelveMonths),
    };
  }
  return map;
}