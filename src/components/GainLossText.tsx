import { formatCurrency, formatPercent } from "@/lib/format";

// Signed currency figure colored green/red; the arrow glyph carries the sign redundantly with color.
export function GainLossText({
  value,
  percent,
  precise = false,
}: {
  value: number | null;
  percent?: number | null;
  precise?: boolean;
}) {
  if (value === null) return <span className="text-ink-muted">—</span>;

  const isGain = value >= 0;
  const colorClass = isGain ? "text-gain" : "text-loss";
  const arrow = isGain ? "▲" : "▼";

  return (
    <span className={`tnum font-medium ${colorClass}`}>
      {arrow} {formatCurrency(Math.abs(value), precise)}
      {percent != null && (
        <span className="ml-1 text-xs opacity-80">({formatPercent(Math.abs(percent))})</span>
      )}
    </span>
  );
}
