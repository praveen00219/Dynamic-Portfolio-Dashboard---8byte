import { HOLDINGS, SECTOR_ORDER } from "@/data/holdings";
import { getOrFetch } from "@/lib/cache";
import { getGoogleFundamentals } from "@/lib/google";
import { fetchYahooQuotes, type YahooQuote } from "@/lib/yahoo";
import type {
  Aggregates,
  PortfolioResponse,
  SectorGroup,
  StockRow,
} from "@/lib/types";

// Assembles the full portfolio payload: holdings + Yahoo CMP + Google P/E & EPS -> computed fields -> sector aggregates -> grand totals.

const QUOTE_TTL_MS = 15_000; // matches the dashboard refresh interval

const TOTAL_INVESTMENT = HOLDINGS.reduce(
  (sum, h) => sum + h.purchasePrice * h.quantity,
  0,
);

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function buildPortfolio(): Promise<PortfolioResponse> {
  const warnings: string[] = [];

  // 1. CMP for every stock in one batched Yahoo call.
  let quotes: Record<string, YahooQuote> = {};
  let quotesStale = false;
  try {
    const result = await getOrFetch("yahoo:quotes", QUOTE_TTL_MS, () =>
      fetchYahooQuotes(HOLDINGS.map((h) => h.yahooSymbol)),
    );
    quotes = result.value;
    quotesStale = result.stale;
    if (quotesStale)
      warnings.push(
        "Yahoo Finance is temporarily unreachable — showing the last fetched prices.",
      );
  } catch {
    warnings.push(
      "Yahoo Finance is unreachable and no cached prices exist yet — CMP unavailable.",
    );
  }

  // 2. P/E + latest earnings per stock (throttled scraping, cached, fallback).
  const fundamentals = await Promise.all(
    HOLDINGS.map((h) => getGoogleFundamentals(h.googleSymbol)),
  );

  // 3. Merge into display rows.
  let googleMisses = 0;
  const rows: StockRow[] = HOLDINGS.map((holding, i) => {
    const quote = quotes[holding.yahooSymbol];
    const google = fundamentals[i];

    const investment = round2(holding.purchasePrice * holding.quantity);
    // Symmetric failover: Yahoo is the live CMP source; Google's previous close fills in if Yahoo can't resolve the symbol.
    const yahooCmp = quote?.cmp ?? null;
    const cmp = yahooCmp ?? google?.data.previousClose ?? null;
    const cmpSource: StockRow["cmpSource"] =
      yahooCmp !== null ? "yahoo" : cmp !== null ? "google" : null;
    const presentValue = cmp !== null ? round2(cmp * holding.quantity) : null;
    const gainLoss = presentValue !== null ? round2(presentValue - investment) : null;

    let peRatio: number | null;
    let latestEarnings: number | null;
    let fundamentalsSource: StockRow["fundamentalsSource"];
    if (google) {
      // Google may know P/E but not EPS (or vice versa) — fill gaps from Yahoo.
      peRatio = google.data.peRatio ?? quote?.peRatio ?? null;
      latestEarnings = google.data.eps ?? quote?.eps ?? null;
      fundamentalsSource = "google";
    } else {
      googleMisses++;
      peRatio = quote?.peRatio ?? null;
      latestEarnings = quote?.eps ?? null;
      fundamentalsSource = peRatio !== null || latestEarnings !== null ? "yahoo" : null;
    }

    const failures: string[] = [];
    if (cmp === null) failures.push("live price unavailable");
    if (peRatio === null && latestEarnings === null)
      failures.push("fundamentals unavailable");

    return {
      ...holding,
      investment,
      portfolioPercent: round2((investment / TOTAL_INVESTMENT) * 100),
      cmp,
      presentValue,
      gainLoss,
      gainLossPercent:
        gainLoss !== null ? round2((gainLoss / investment) * 100) : null,
      peRatio,
      latestEarnings,
      cmpSource,
      fundamentalsSource,
      stale: quotesStale || (google?.stale ?? false),
      error: failures.length ? failures.join("; ") : null,
    };
  });

  if (googleMisses > 0)
    warnings.push(
      `Google Finance data unavailable for ${googleMisses} stock${
        googleMisses > 1 ? "s" : ""
      } — Yahoo Finance figures used as fallback.`,
    );

  // 4. Sector grouping + aggregates.
  const sectors: SectorGroup[] = SECTOR_ORDER.map((sector) => {
    const stocks = rows.filter((r) => r.sector === sector);
    return { sector, stocks, totals: aggregate(stocks) };
  });

  return {
    asOf: new Date().toISOString(),
    totals: aggregate(rows),
    sectors,
    warnings,
  };
}

function aggregate(stocks: StockRow[]): Aggregates {
  const investment = stocks.reduce((s, r) => s + r.investment, 0);
  // Only priced stocks contribute to present value/gain-loss %, so a missing price doesn't skew the sector average.
  const priced = stocks.filter((r) => r.presentValue !== null);
  const pricedInvestment = priced.reduce((s, r) => s + r.investment, 0);
  const presentValue = priced.reduce((s, r) => s + (r.presentValue ?? 0), 0);
  const gainLoss = presentValue - pricedInvestment;

  return {
    investment: round2(investment),
    presentValue: round2(presentValue),
    gainLoss: round2(gainLoss),
    gainLossPercent:
      pricedInvestment > 0 ? round2((gainLoss / pricedInvestment) * 100) : 0,
    portfolioPercent: round2((investment / TOTAL_INVESTMENT) * 100),
  };
}