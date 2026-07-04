"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SectorGroup } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { colorForSector, GAIN_COLOR, LOSS_COLOR } from "@/lib/palette";

interface Props {
  sectors: SectorGroup[];
}

// Allocation is part-to-whole (100%-stacked bar, categorical color); Sector Gain/Loss is above/below a baseline (diverging bar, colored by sign).
export function SectorCharts({ sectors }: Props) {
  const totalInvestment = sectors.reduce((s, g) => s + g.totals.investment, 0);

  const allocationRow: Record<string, number | string> = { name: "Portfolio" };
  for (const g of sectors) allocationRow[g.sector] = g.totals.investment;

  const gainLossData = sectors.map((g) => ({
    sector: g.sector,
    gainLoss: g.totals.gainLoss,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="hairline rounded-lg bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-secondary">Sector Allocation (Investment)</h2>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart layout="vertical" data={[allocationRow]} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, totalInvestment]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value, sector) => {
                const num = typeof value === "number" ? value : Number(value ?? 0);
                return [
                  `${formatCurrency(num)} (${formatPercent((num / totalInvestment) * 100)})`,
                  String(sector),
                ];
              }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-grid)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {sectors.map((g) => (
              <Bar
                key={g.sector}
                dataKey={g.sector}
                stackId="allocation"
                fill={colorForSector(g.sector)}
                radius={0}
                label={(props: {
                  x?: number | string;
                  y?: number | string;
                  width?: number | string;
                  height?: number | string;
                }) => {
                  const x = Number(props.x ?? 0);
                  const y = Number(props.y ?? 0);
                  const width = Number(props.width ?? 0);
                  const height = Number(props.height ?? 0);
                  const pct = (g.totals.investment / totalInvestment) * 100;
                  if (width < 42) return <g />; // too narrow to label; still reachable via legend/tooltip
                  return (
                    <text
                      x={x + width / 2}
                      y={y + height / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                      fill="#ffffff"
                    >
                      {formatPercent(pct)}
                    </text>
                  );
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {/* Custom HTML legend since recharts' <Legend> needs a live chart context a standalone instance can't provide. */}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
          {sectors.map((g) => (
            <li key={g.sector} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: colorForSector(g.sector) }}
              />
              {g.sector} ({formatPercent((g.totals.investment / totalInvestment) * 100)})
            </li>
          ))}
        </ul>
      </div>

      <div className="hairline rounded-lg bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-secondary">Sector Gain / Loss</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            layout="vertical"
            data={gainLossData}
            margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
          >
            <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }} />
            <YAxis
              type="category"
              dataKey="sector"
              width={110}
              tick={{ fontSize: 12, fill: "var(--color-ink-secondary)" }}
            />
            <ReferenceLine x={0} stroke="var(--color-baseline)" />
            <Tooltip
              formatter={(value) => [formatCurrency(typeof value === "number" ? value : Number(value ?? 0)), "Gain / Loss"]}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-grid)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="gainLoss" radius={4} maxBarSize={20}>
              {gainLossData.map((d) => (
                <Cell key={d.sector} fill={d.gainLoss >= 0 ? GAIN_COLOR : LOSS_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
