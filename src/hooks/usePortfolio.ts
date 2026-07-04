"use client";

import useSWR from "swr";
import type { PortfolioResponse } from "@/lib/types";

// Polls GET /api/portfolio every 15s; keepPreviousData means a slow/failed refresh never blanks the table.

const REFRESH_INTERVAL_MS = 15_000;

async function fetcher(url: string): Promise<PortfolioResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function usePortfolio() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioResponse>(
    "/api/portfolio",
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: REFRESH_INTERVAL_MS,
    },
  );

  return {
    data,
    error: error as Error | undefined,
    isLoading,
    isStale: data?.sectors.some((s) => s.stocks.some((r) => r.stale)) ?? false, // true once data is from a stale server-side cache
    refresh: mutate,
  };
}
