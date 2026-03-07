import path from "node:path"
import fs from "node:fs"

const DATA_DIR = path.resolve(__dirname, "../data");

export function ensureFolder(folderPath: string): string {
  const fullPath = path.resolve(DATA_DIR, folderPath);
  if (!fullPath.startsWith(DATA_DIR)) {
    throw new Error("Invalid folder path: Path traversal is not allowed.");
  }
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

export function ensureFile(filePath: string, contents?: string): string {
  const fullPath = path.resolve(DATA_DIR, filePath);
  if (!fullPath.startsWith(DATA_DIR)) {
    throw new Error("Invalid file path: Path traversal is not allowed.");
  }
  if (!fs.existsSync(path.dirname(fullPath))) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  }
  if (contents !== undefined && !fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, contents);
  }
  return fullPath;
}

export function readJSON<T>(filePath: string): T | undefined{
  const fullPath = path.resolve(DATA_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    return undefined;
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

export function writeJSON<T>(filePath: string, data: T): string {
  const fullPath = ensureFile(filePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + "\n");
  return fullPath;
}


export interface WeeklyDeal {
  productName: string;
  productId: string;
  salePrice: number | null;
  regularPrice: number | null;
  averageHistoricalPrice?: number | null;
  maxHistoricalPrice?: number | null;
  isPriceGouge?: boolean;
  canadianTireUrl?: string;
  tirespyUrl?: string;
  lowerHistoricalPrices?: PriceEntry[];
}

export interface PriceValue {
  value: number | null;
}

export interface SearchApiProduct {
  code?: string;
  title?: string;
  currentPrice?: number;
  originalPrice?: number;
}

export interface PriceApiProduct {
  code?: string;
  currentPrice?: PriceValue;
  originalPrice?: PriceValue;
  isOnSale?: boolean;
}

export interface SearchApiResponse {
  products?: SearchApiProduct[];
}

export interface PriceEntry {
  date: string;
  price: number;
}

export interface Variant {
  code: string;
  priceHistory: PriceEntry[];
}

export interface PriceHistoryFile {
  code: string;
  url?: string;
  variants: Variant[];
}
