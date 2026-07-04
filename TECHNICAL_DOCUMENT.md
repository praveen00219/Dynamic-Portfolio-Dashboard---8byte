# Technical Document — Dynamic Portfolio Dashboard

Short write-up of the key technical challenges in this case study and how each
was addressed. Written to be defensible in an interview walkthrough.

## 1. Yahoo Finance & Google Finance have no official APIs

Both are unofficial data sources by the case study's own framing, so the
strategy for each is deliberately different because their failure modes differ:

- **Yahoo Finance (CMP)** — uses the `yahoo-finance2` npm package, which talks
  to Yahoo's internal quote endpoint (handles cookie/crumb auth internally).
  This is a maintained community library rather than raw HTML scraping, so it
  is comparatively resilient, but it is still an unofficial, undocumented API
  that can change without notice.
- **Google Finance (P/E, Latest Earnings)** — has no equivalent library, so
  `src/lib/google.ts` fetches the quote page
  (`google.com/finance/quote/<SYMBOL>:<EXCHANGE>`) directly and parses it with
  `cheerio`. To reduce (not eliminate) fragility, the parser is anchored on
  **visible label text** ("P/E ratio", "Earnings per share", "Previous close")
  rather than Google's obfuscated, auto-generated CSS class names — class names
  change on every Google frontend deploy; label text is far more stable.

**Symbol resolution was the biggest practical gotcha.** The case-study sheet
lists some stocks by numeric BSE scrip code (e.g. `532174`); Yahoo resolves
NSE tickers (`.NS`) far more reliably than numeric BSE codes (`.BO` — several
returned `undefined` in testing, e.g. `532174.BO`, `544252.BO`). The fix was to
look up each BSE-listed stock's NSE ticker once and store both the sheet's
original exchange code (for display, since the table must show what the sheet
shows) and a separately curated `yahooSymbol`/`googleSymbol` pair (for the
actual API calls) in `src/data/holdings.ts`.

One stock, **LTI Mindtree (LTIM)**, could not be resolved on either provider
under any symbol variant tried (`.NS`, `.BO`, ticker search) — it appears to
have been renamed/delisted since the sheet was authored. Rather than hiding
this, the row renders with `—` and the discrepancy is called out in the README
and in-app footnote. This is a deliberate "acknowledge the limitation" choice
per the case study's own instruction to surface unofficial-API caveats.

## 2. Rate limiting & performance

- **Batching.** All 26 Yahoo quotes are fetched in a **single** batched
  `quote()` call, not 26 individual requests.
- **Throttling.** Google Finance scrapes are capped at **4 concurrent
  requests** via a small custom limiter (`createLimiter` in `src/lib/cache.ts`)
  — enough parallelism to keep latency reasonable without hammering the site.
- **Caching with different TTLs per data shape.** CMP is cached **15 seconds**
  (matches the dashboard's own refresh cadence — no point caching shorter than
  the UI polls). P/E and earnings are cached **10 minutes**, since fundamentals
  change far less often than price; this cuts Google scraping load by roughly
  40x relative to matching the 15s price refresh.
- **Server-side cache, not per-client.** The cache lives in the Node process
  (`globalThis`, survives Next.js dev HMR), so N browser tabs polling every 15s
  still only trigger one upstream fetch per TTL window — the cache is shared,
  not per-request.
- **Request coalescing (single-flight).** If two requests for the same cache
  key arrive while a refresh is already in flight, the second awaits the first
  instead of firing a duplicate upstream call.

## 3. Data transformation

Raw quotes and scraped fundamentals are merged with the static holdings in
`src/lib/portfolio.ts`: `Investment = Purchase Price × Qty`, `Present Value =
CMP × Qty`, `Gain/Loss = Present Value − Investment`, `Portfolio % = Investment
/ Total Investment`, plus sector-level and grand-total aggregates computed the
same way over the group's stocks. All monetary math is rounded to 2 decimal
places consistently before display to avoid floating-point noise in the UI.

## 4. Error handling — designed as two severities, not one

- **Partial failure** (a handful of stocks miss Google fundamentals, or the
  whole Google scrape is briefly rate-limited): the API falls back to Yahoo's
  own `trailingPE` / `epsTrailingTwelveMonths` (and, symmetrically, Google's
  "previous close" if Yahoo can't price a symbol at all). The response still
  returns `200` with the best data available, plus a `warnings[]` array the UI
  renders as a dismissible banner. Affected cells show `—`/`~` rather than
  breaking the table.
- **Total failure** (upstream fully unreachable, no cache yet): the API returns
  `502` with a message; the client (`ErrorBanner`) shows a hard error with a
  retry button, and — because SWR's `keepPreviousData` is enabled — any
  *previously* loaded data stays on screen instead of being wiped out by a
  transient blip.
- **Stale-on-error at the cache layer**: if a refresh fails but an expired
  cached value exists, that expired value is served anyway (flagged `stale`)
  rather than propagating the error — the dashboard degrades to "last known
  good" instead of going blank.

## 5. Performance optimization in the UI

- Table rows are wrapped in `React.memo` (`StockRowView`) so a 15s data refresh
  only re-renders rows whose figures actually changed.
- SWR's `dedupingInterval` matches the 15s refresh interval, so re-renders,
  focus events, or duplicate mounts never trigger duplicate fetches.
- `keepPreviousData: true` avoids full unmount/remount (and the layout
  flash that comes with it) on every poll — only the changed values repaint.

## 6. Security

No API keys are required by either provider, but the same principle is applied
anyway: **all upstream calls happen inside the API route** (`runtime =
"nodejs"`), never in client components. The browser bundle contains no
scraping logic, headers, or endpoints — only a `fetch('/api/portfolio')` call.

## 7. Visual design

Gain/Loss is never color-only: every figure carries a redundant ▲/▼ marker
alongside the green/red text, and the categorical sector palette (used in the
allocation chart) was validated against colorblind-safe contrast rules before
use (worst adjacent color-difference ΔE 24.2, well above the ≥12 target) rather
than picked by eye.
