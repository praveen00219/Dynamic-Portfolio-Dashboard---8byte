import type { Aggregates } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/format";
import { GainLossText } from "@/components/GainLossText";

interface Props {
  totals: Aggregates;
  asOf: string | undefined;
  isStale: boolean;
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hairline rounded-lg bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-1.5 text-xl font-semibold tnum">{children}</div>
    </div>
  );
}

export function SummaryCards({ totals, asOf, isStale }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Total Investment">{formatCurrency(totals.investment)}</Card>
      <Card label="Present Value">{formatCurrency(totals.presentValue)}</Card>
      <Card label="Total Gain / Loss">
        <GainLossText value={totals.gainLoss} percent={totals.gainLossPercent} />
      </Card>
      <div className="hairline rounded-lg bg-surface p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Last Updated</p>
        <div className="mt-1.5 flex items-center gap-2 text-xl font-semibold tnum">
          {formatTime(asOf)}
          <span
            className={`inline-block h-2 w-2 rounded-full ${isStale ? "bg-warn" : "bg-gain-mark"}`}
            title={isStale ? "Showing cached data" : "Live"}
          />
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">{isStale ? "Cached (stale)" : "Live"} · refreshes every 15s</p>
      </div>
    </div>
  );
}
