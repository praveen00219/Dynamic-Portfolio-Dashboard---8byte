"use client";

import { Fragment, memo, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Row,
} from "@tanstack/react-table";
import type { SectorGroup, StockRow } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { GainLossText } from "@/components/GainLossText";

interface Props {
  sectors: SectorGroup[];
}

const columnHelper = createColumnHelper<StockRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Particulars",
    cell: (c) => <span className="font-medium text-ink">{c.getValue()}</span>,
  }),
  columnHelper.accessor("purchasePrice", {
    header: "Purchase Price",
    cell: (c) => <span className="tnum">{formatCurrency(c.getValue(), true)}</span>,
  }),
  columnHelper.accessor("quantity", {
    header: "Qty",
    cell: (c) => <span className="tnum">{formatNumber(c.getValue(), 0)}</span>,
  }),
  columnHelper.accessor("investment", {
    header: "Investment",
    cell: (c) => <span className="tnum">{formatCurrency(c.getValue())}</span>,
  }),
  columnHelper.accessor("portfolioPercent", {
    header: "Portfolio (%)",
    cell: (c) => <span className="tnum">{formatPercent(c.getValue())}</span>,
  }),
  columnHelper.accessor("exchangeCode", {
    header: "NSE/BSE",
    cell: (c) => <span className="text-ink-secondary">{c.getValue()}</span>,
  }),
  columnHelper.accessor("cmp", {
    header: "CMP",
    cell: (c) => {
      const row = c.row.original;
      return (
        <span className="tnum" title={row.cmpSource === "google" ? "Approximated from Google Finance previous close" : undefined}>
          {formatCurrency(c.getValue(), true)}
          {row.cmpSource === "google" && <sup className="ml-0.5 text-warn">~</sup>}
        </span>
      );
    },
  }),
  columnHelper.accessor("presentValue", {
    header: "Present Value",
    cell: (c) => <span className="tnum">{formatCurrency(c.getValue())}</span>,
  }),
  columnHelper.accessor("gainLoss", {
    header: "Gain/Loss",
    cell: (c) => <GainLossText value={c.getValue()} percent={c.row.original.gainLossPercent} />,
  }),
  columnHelper.accessor("peRatio", {
    header: "P/E Ratio",
    cell: (c) => <span className="tnum">{formatNumber(c.getValue())}</span>,
  }),
  columnHelper.accessor("latestEarnings", {
    header: "Latest Earnings",
    cell: (c) => <span className="tnum">{formatNumber(c.getValue())}</span>,
  }),
];

const StockRowView = memo(function StockRowView({ row }: { row: Row<StockRow> }) {
  const hasError = Boolean(row.original.error);
  return (
    <tr className={`border-b border-grid last:border-0 hover:bg-plane/60 ${hasError ? "opacity-70" : ""}`}>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="whitespace-nowrap px-3 py-2 text-sm" title={row.original.error ?? undefined}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

function SectorHeaderRow({
  group,
  collapsed,
  onToggle,
  colSpan,
}: {
  group: SectorGroup;
  collapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}) {
  return (
    <tr className="border-b border-grid bg-plane/80">
      <td colSpan={colSpan} className="px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 text-left text-sm"
        >
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <span className={`inline-block transition-transform ${collapsed ? "-rotate-90" : ""}`}>▾</span>
            {group.sector}
            <span className="font-normal text-ink-muted">({group.stocks.length})</span>
          </span>
          <span className="text-ink-secondary">
            Investment: <span className="tnum font-medium text-ink">{formatCurrency(group.totals.investment)}</span>
          </span>
          <span className="text-ink-secondary">
            Present Value: <span className="tnum font-medium text-ink">{formatCurrency(group.totals.presentValue)}</span>
          </span>
          <span className="text-ink-secondary">
            Gain/Loss: <GainLossText value={group.totals.gainLoss} percent={group.totals.gainLossPercent} />
          </span>
        </button>
      </td>
    </tr>
  );
}

export function PortfolioTable({ sectors }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const allStocks = useMemo(() => sectors.flatMap((g) => g.stocks), [sectors]);

  const table = useReactTable({
    data: allStocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  // Only 26 rows, so recomputing this grouping every render is negligible — no memo needed.
  const rowsBySector = new Map<string, Row<StockRow>[]>();
  for (const row of table.getRowModel().rows) {
    const bucket = rowsBySector.get(row.original.sector) ?? [];
    bucket.push(row);
    rowsBySector.set(row.original.sector, bucket);
  }

  return (
    <div className="hairline overflow-x-auto rounded-lg bg-surface shadow-sm">
      <table className="w-full min-w-240 border-collapse">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-grid text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            {table.getFlatHeaders().map((header) => (
              <th key={header.id} className="whitespace-nowrap px-3 py-2">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.map((group) => {
            const isCollapsed = collapsed[group.sector] ?? false;
            const rows = rowsBySector.get(group.sector) ?? [];
            return (
              <Fragment key={group.sector}>
                <SectorHeaderRow
                  group={group}
                  collapsed={isCollapsed}
                  colSpan={columns.length}
                  onToggle={() =>
                    setCollapsed((prev) => ({ ...prev, [group.sector]: !isCollapsed }))
                  }
                />
                {!isCollapsed && rows.map((row) => <StockRowView key={row.id} row={row} />)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
