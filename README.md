# Dynamic Portfolio Dashboard

A live portfolio dashboard for a 26-stock Indian equity portfolio. Current Market
Price comes from **Yahoo Finance**, P/E ratio and latest earnings from **Google
Finance** — refreshed automatically every 15 seconds, grouped by sector, with
green/red gain-loss indicators.

Built for the Octa Byte AI case study: **Next.js (App Router) + TypeScript +
Tailwind CSS**, with the Next.js API route serving as the **Node.js backend**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API keys or environment
variables are required — everything is either a public unofficial endpoint
(Yahoo) or a server-side scrape (Google), both called only from the server.

Other scripts:

```bash
npm run build   # production build (also type-checks)
npm run start   # run the production build
npm run lint    # ESLint
```

## Architecture

```
src/
├─ app/
│  ├─ page.tsx                 # dashboard (client component)
│  ├─ layout.tsx, globals.css  # shell + design tokens (Tailwind v4 theme)
│  └─ api/portfolio/route.ts   # GET — the Node.js backend endpoint
├─ data/holdings.ts            # the 26 static holdings (from the case-study sheet)
├─ lib/
│  ├─ types.ts                 # Holding / StockRow / SectorGroup / PortfolioResponse
│  ├─ cache.ts                 # in-memory TTL cache, stale-on-error, request coalescing
│  ├─ yahoo.ts                 # batched CMP fetch (yahoo-finance2)
│  ├─ google.ts                # P/E + EPS scrape (cheerio), throttled + cached
│  ├─ portfolio.ts             # merge + compute (investment, present value, gain/loss, sector totals)
│  ├─ format.ts                # ₹ / % / time formatting (en-IN locale)
│  └─ palette.ts                # validated chart color palette
├─ hooks/usePortfolio.ts        # SWR polling (15s) with stale-while-revalidate
└─ components/                 # SummaryCards, SectorCharts, PortfolioTable, ErrorBanner, …
```

**Everything upstream-facing runs server-side**, inside the API route (Node.js
runtime). The browser only ever talks to `/api/portfolio` — it never calls Yahoo
or Google directly, so there are no API keys or scraping headers to leak, and one
in-memory cache is shared by every visitor.

### Data flow

1. `GET /api/portfolio` calls `buildPortfolio()` (`src/lib/portfolio.ts`).
2. **CMP**: one batched `yahoo-finance2` `quote()` call for all 26 symbols, cached
   15s (matches the dashboard's refresh interval — a burst of client polls from
   many tabs still only costs one upstream call per window).
3. **P/E + Latest Earnings**: Google Finance has no public API, so each symbol's
   quote page is scraped with `cheerio`, throttled to 4 concurrent requests,
   cached 10 minutes (fundamentals move far slower than price).
4. **Symmetric failover**: if Google can't be scraped for a stock, its P/E/EPS
   fall back to Yahoo's `trailingPE`/`epsTrailingTwelveMonths`. If Yahoo can't
   resolve a symbol's price, Google's "previous close" is used as an
   approximate CMP (marked with a `~` in the table). A row only shows `—` if
   *both* sources fail.
5. Per-stock figures (Investment, Portfolio %, Present Value, Gain/Loss) and
   per-sector + grand totals are computed and returned as one JSON payload.
6. The client polls this endpoint every 15s via SWR (`src/hooks/usePortfolio.ts`)
   with `keepPreviousData` so a slow or failed refresh never blanks the screen.

See [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md) for the reasoning behind
these choices and the trade-offs made.

## Features

- All required columns: Particulars, Purchase Price, Qty, Investment,
  Portfolio (%), NSE/BSE, CMP, Present Value, Gain/Loss, P/E Ratio, Latest
  Earnings (plus Gain/Loss % for context).
- Sector grouping (Financial, Tech, Consumer, Power, Pipe, Others) with
  collapsible sector headers showing sector-level Investment / Present Value /
  Gain-Loss.
- Auto-refresh every 15 seconds; a "last updated" indicator shows live vs.
  cached (stale) data.
- Green/red gain-loss coloring with a redundant ▲/▼ marker (not color-only).
- Sector allocation chart (100%-stacked bar) and per-sector Gain/Loss chart
  (`recharts`), using a palette validated for colorblind-safe contrast.
- Graceful degradation: partial upstream failures show a warning banner and
  fall back to the counterpart data source instead of breaking the table.

## Known data caveats

- **LTI Mindtree (LTIM)** could not be resolved on either Yahoo or Google under
  any symbol variant tried (`.NS`, `.BO`, ticker search) — it appears to have
  been delisted/renamed since the case-study sheet was authored. The row
  renders with `—` for CMP/fundamentals rather than a fabricated number.
- Google Finance is scraped (no official API) — its markup can change without
  notice. The scraper is anchored on visible label text ("P/E ratio", "Earnings
  per share") rather than CSS class names to reduce (not eliminate) breakage risk.
- Prices and fundamentals are for informational purposes only — this is not
  investment advice.
