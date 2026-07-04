const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number | null, precise = false): string {
  if (value === null) return "—";
  return precise ? inrPrecise.format(value) : inr.format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${percent.format(value)}%`;
}

export function formatNumber(value: number | null, digits = 2): string {
  if (value === null) return "—";
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour12: true });
}
