import type { Sector } from "@/lib/types";
import { SECTOR_ORDER } from "@/data/holdings";

// Mirrors the categorical hex slots in globals.css (--color-cat-1..6) — recharts SVG fill needs raw hex, not CSS custom properties.
const CATEGORICAL_HEX = [
  "#2a78d6", // slot 1 — blue
  "#1baf7a", // slot 2 — aqua
  "#eda100", // slot 3 — yellow
  "#008300", // slot 4 — green
  "#4a3aa7", // slot 5 — violet
  "#e34948", // slot 6 — red
];

const SECTOR_COLOR: Record<Sector, string> = Object.fromEntries(
  SECTOR_ORDER.map((sector, i) => [sector, CATEGORICAL_HEX[i % CATEGORICAL_HEX.length]]),
) as Record<Sector, string>;

export function colorForSector(sector: Sector): string {
  return SECTOR_COLOR[sector];
}

export const GAIN_COLOR = "#0ca30c";
export const LOSS_COLOR = "#d03b3b";
