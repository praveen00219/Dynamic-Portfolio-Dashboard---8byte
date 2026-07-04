import type { Holding, Sector } from "@/lib/types";

// Portfolio holdings from the case-study Excel; yahooSymbol is curated separately since Yahoo resolves NSE tickers more reliably than numeric BSE codes.

type Row = [
  name: string,
  exchangeCode: string,
  exchange: "NSE" | "BSE",
  purchasePrice: number,
  quantity: number,
  nseTicker: string | null, // null → BSE-only stock
];

const ROWS: Record<Sector, Row[]> = {
  "Financial Sector": [
    ["HDFC Bank", "HDFCBANK", "NSE", 1490, 50, "HDFCBANK"],
    ["Bajaj Finance", "BAJFINANCE", "NSE", 6466, 15, "BAJFINANCE"],
    ["ICICI Bank", "532174", "BSE", 780, 84, "ICICIBANK"],
    ["Bajaj Housing", "544252", "BSE", 130, 504, "BAJAJHFL"],
    ["Savani Financials", "511577", "BSE", 24, 1080, null],
  ],
  "Tech Sector": [
    ["Affle India", "AFFLE", "NSE", 1151, 50, "AFFLE"],
    ["LTI Mindtree", "LTIM", "NSE", 4775, 16, "LTIM"],
    ["KPIT Tech", "542651", "BSE", 672, 61, "KPITTECH"],
    ["Tata Tech", "544028", "BSE", 1072, 63, "TATATECH"],
    ["BLS E-Services", "544107", "BSE", 232, 191, "BLSE"],
    ["Tanla", "532790", "BSE", 1134, 45, "TANLA"],
  ],
  Consumer: [
    ["Dmart", "DMART", "NSE", 3777, 27, "DMART"],
    ["Tata Consumer", "532540", "BSE", 845, 90, "TATACONSUM"],
    ["Pidilite", "500331", "BSE", 2376, 36, "PIDILITIND"],
  ],
  Power: [
    ["Tata Power", "500400", "BSE", 224, 225, "TATAPOWER"],
    ["KPI Green", "542323", "BSE", 875, 50, "KPIGREEN"],
    ["Suzlon", "532667", "BSE", 44, 450, "SUZLON"],
    ["Gensol", "542851", "BSE", 998, 45, "GENSOL"],
  ],
  "Pipe Sector": [
    ["Hariom Pipes", "543517", "BSE", 580, 60, "HARIOMPIPE"],
    ["Astral", "ASTRAL", "NSE", 1517, 56, "ASTRAL"],
    ["Polycab", "542652", "BSE", 2818, 28, "POLYCAB"],
  ],
  Others: [
    ["Clean Science", "543318", "BSE", 1610, 32, "CLEAN"],
    ["Deepak Nitrite", "506401", "BSE", 2248, 27, "DEEPAKNTR"],
    ["Fine Organic", "541557", "BSE", 4284, 16, "FINEORG"],
    ["Gravita", "533282", "BSE", 2037, 8, "GRAVITA"],
    ["SBI Life", "540719", "BSE", 1197, 49, "SBILIFE"],
  ],
};

const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const HOLDINGS: Holding[] = (
  Object.entries(ROWS) as [Sector, Row[]][]
).flatMap(([sector, rows]) =>
  rows.map(([name, exchangeCode, exchange, purchasePrice, quantity, nse]) => ({
    id: toId(name),
    name,
    sector,
    exchangeCode,
    exchange,
    purchasePrice,
    quantity,
    yahooSymbol: nse ? `${nse}.NS` : `${exchangeCode}.BO`,
    googleSymbol: nse ? `${nse}:NSE` : `${exchangeCode}:BOM`,
  })),
);

// Sector display order, as in the source sheet.
export const SECTOR_ORDER: Sector[] = Object.keys(ROWS) as Sector[];