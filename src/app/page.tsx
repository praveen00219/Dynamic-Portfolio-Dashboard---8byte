"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { SummaryCards } from "@/components/SummaryCards";
import { SectorCharts } from "@/components/SectorCharts";
import { PortfolioTable } from "@/components/PortfolioTable";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function Home() {
  const { data, error, isLoading, isStale, refresh } = usePortfolio();

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Dynamic Portfolio Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          CMP from Yahoo Finance · P/E ratio &amp; latest earnings from Google Finance · refreshes every 15s
        </p>
      </header>

      {(error || (data?.warnings.length ?? 0) > 0) && (
        <ErrorBanner error={data ? undefined : error} warnings={data?.warnings} onRetry={() => refresh()} />
      )}

      {!data && isLoading && <TableSkeleton />}

      {data && (
        <>
          <SummaryCards totals={data.totals} asOf={data.asOf} isStale={isStale} />
          <SectorCharts sectors={data.sectors} />
          <PortfolioTable sectors={data.sectors} />
          <p className="text-xs text-ink-muted">
            CMP is sourced from Yahoo Finance (unofficial API); P/E ratio and latest earnings from Google Finance
            (scraped, no official API). Figures marked <span className="text-warn">~</span> are approximated from
            the counterpart source when the primary one is unavailable. Data may be delayed or occasionally
            inaccurate — for informational purposes only, not investment advice.
          </p>
        </>
      )}
    </main>
  );
}
