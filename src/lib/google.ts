import * as cheerio from "cheerio";
import { createLimiter, getOrFetch } from "@/lib/cache";

// Google Finance adapter (P/E ratio + Latest Earnings) — scrapes the quote page since there's no public API.
// Parsing is anchored on visible label text ("P/E ratio", "Earnings per share") rather than CSS classes, which are more likely to shift on redeploy.
// Rate-limit protection: 10min cache per symbol, max 4 concurrent requests, and a failed scrape just returns null so the caller falls back to Yahoo.

export interface GoogleFundamentals {
  peRatio: number | null;
  eps: number | null;
  previousClose: number | null; // approximate CMP fallback when Yahoo can't resolve the symbol at all
}

const FUNDAMENTALS_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REQUEST_TIMEOUT_MS = 8_000;
const limit = createLimiter(4);

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// "18.69" | "1,234.56" | "-12.3" | "-" -> number | null
function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s%₹$]/g, "").replace(/[−–]/g, "-");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

// Finds the value that sits next to an exact label text on the quote page (key-stats grid row).
function valueForLabel($: cheerio.CheerioAPI, label: string): string | undefined {
  let found: string | undefined;
  $("div, td, span").each((_, el) => {
    if (found) return;
    const node = $(el);
    if (node.text().trim() !== label) return;
    // The value lives in a sibling (stats grid) or the next cell (tables).
    const sibling = node.next();
    const siblingText = sibling.text().trim();
    if (siblingText && siblingText !== label) {
      found = siblingText;
      return;
    }
    const parentText = node.parent().text().trim();
    const remainder = parentText.replace(label, "").trim();
    if (remainder) found = remainder;
  });
  return found;
}

async function scrapeQuotePage(symbol: string): Promise<GoogleFundamentals> {
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Finance responded ${res.status} for ${symbol}`);

  const $ = cheerio.load(await res.text());
  const peRatio = parseNumber(valueForLabel($, "P/E ratio"));
  const eps = parseNumber(valueForLabel($, "Earnings per share")); // "Latest Earnings"
  const previousClose = parseNumber(valueForLabel($, "Previous close"));

  if (peRatio === null && eps === null && previousClose === null) {
    // Page loaded but nothing found (quote-not-found page or markup change) — treat as a scrape miss so the caller falls back to Yahoo.
    throw new Error(`No fundamentals found on Google Finance page for ${symbol}`);
  }
  return { peRatio, eps, previousClose };
}

// Cached + throttled accessor; returns null when Google is unavailable and no stale copy exists.
export async function getGoogleFundamentals(
  symbol: string,
): Promise<{ data: GoogleFundamentals; stale: boolean } | null> {
  try {
    const { value, stale } = await getOrFetch(
      `google:${symbol}`,
      FUNDAMENTALS_TTL_MS,
      () => limit(() => scrapeQuotePage(symbol)),
    );
    return { data: value, stale };
  } catch {
    return null;
  }
}