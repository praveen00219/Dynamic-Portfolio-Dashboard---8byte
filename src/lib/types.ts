// Core data model: Holding (static) -> StockRow (+ live data) -> SectorGroup -> PortfolioResponse.

export type Sector =
  | "Financial Sector"
  | "Tech Sector"
  | "Consumer"
  | "Power"
  | "Pipe Sector"
  | "Others";

export interface Holding {
  id: string; // kebab-case of the name
  name: string; // Particulars
  sector: Sector;
  exchangeCode: string; // NSE ticker or BSE scrip code, exactly as in the sheet
  exchange: "NSE" | "BSE";
  purchasePrice: number;
  quantity: number;
  yahooSymbol: string; // e.g. "HDFCBANK.NS" or "511577.BO"
  googleSymbol: string; // e.g. "HDFCBANK:NSE" or "511577:BOM"
}

// Where a live figure came from (Google may be unavailable -> Yahoo fallback).
export type FundamentalsSource = "google" | "yahoo" | null;

export interface StockRow extends Holding {
  investment: number; // Purchase Price x Qty
  portfolioPercent: number; // share of total portfolio investment, 0-100

  cmp: number | null; // Current Market Price from Yahoo Finance
  presentValue: number | null; // CMP x Qty
  gainLoss: number | null; // Present Value - Investment
  gainLossPercent: number | null;
  peRatio: number | null; // TTM, Google Finance with Yahoo fallback
  latestEarnings: number | null; // EPS TTM, Google Finance with Yahoo fallback

  cmpSource: "yahoo" | "google" | null; // "google" = previous close used as approximate CMP
  fundamentalsSource: FundamentalsSource;
  stale: boolean; // served from an expired cache after a fetch failure
  error: string | null;
}

export interface Aggregates {
  investment: number;
  presentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  portfolioPercent: number;
}

export interface SectorGroup {
  sector: Sector;
  stocks: StockRow[];
  totals: Aggregates;
}

export interface PortfolioResponse {
  asOf: string; // ISO timestamp of when this payload was assembled
  totals: Aggregates;
  sectors: SectorGroup[];
  warnings: string[]; // non-fatal issues worth surfacing in the UI
}