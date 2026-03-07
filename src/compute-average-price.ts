import { join } from "path";
import {
  type WeeklyDeal,
  type PriceHistoryFile,
  type PriceEntry,
  ensureFolder,
  readJSON,
  writeJSON,
} from "./helpers.js";

/**
 * Computes the time-weighted average price from a price history.
 * Each entry marks the start of a period at that price, lasting until
 * the next entry (or today for the last entry).
 */
function computeTimeWeightedAverage(priceHistory: PriceEntry[]): number | null {
  if (priceHistory.length === 0) {
    return null;
  }

  const sorted = [...priceHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const now = new Date();
  let totalWeightedPrice = 0;
  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const start = new Date(sorted[i].date);
    const end = i < sorted.length - 1 ? new Date(sorted[i + 1].date) : now;
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    totalWeightedPrice += sorted[i].price * days;
    totalDays += days;
  }

  if (totalDays === 0) {
    return sorted[0].price;
  } else {
    return Math.round((totalWeightedPrice / totalDays) * 100) / 100;
  }
}

function computeMaxPrice(priceHistory: PriceEntry[]): number | null {
  if (priceHistory.length === 0) {
    return null;
  }
  return Math.max(...priceHistory.map((e) => e.price));
}

function findPricesLowerThanSalesPrice(
  salePrice: number,
  priceHistory: PriceEntry[],
): PriceEntry[] {
  return priceHistory.filter((entry) => entry.price < salePrice);
}

function padRight(str: string, len: number): string {
  return str.length >= len
    ? str.substring(0, len)
    : str + " ".repeat(len - str.length);
}

export function computeAveragePrices(): void {
  const historyDir = ensureFolder("price-history");

  const deals: WeeklyDeal[] | undefined = readJSON("weekly-deals.json");

  if (!deals) {
    console.log("No deals found.");
    return;
  }

  let augmented = 0;

  for (const deal of deals) {
    const history: PriceHistoryFile | undefined = readJSON(
      join(historyDir, `${deal.productId}.json`),
    );

    if (!history || history.variants.length === 0) {
      deal.averageHistoricalPrice = null;
      continue;
    }

    // Use the first variant's price history
    const variant = history.variants[0];
    const avg = computeTimeWeightedAverage(variant.priceHistory);
    deal.averageHistoricalPrice = avg;

    const max = computeMaxPrice(variant.priceHistory);
    deal.maxHistoricalPrice = max;

    const lowerPrices = findPricesLowerThanSalesPrice(
      deal.salePrice ?? 0,
      variant.priceHistory,
    );
    if (lowerPrices.length > 0) {
      console.log(
        `Note: Found ${lowerPrices.length} historical price(s) below current sale price for ${deal.productName} (${deal.productId}).`,
      );
    }
    deal.lowerHistoricalPrices = lowerPrices;

    if (avg !== null) {
      augmented++;
    }
  }

  // Flag items where sale price is above the historical maximum and print results
  const gouges: WeeklyDeal[] = [];
  for (const deal of deals) {
    if (
      deal.salePrice !== null &&
      deal.maxHistoricalPrice !== null &&
      deal.maxHistoricalPrice !== undefined &&
      deal.salePrice > deal.maxHistoricalPrice
    ) {
      deal.isPriceGouge = true;

      // Add URLs from price history file
      const history: PriceHistoryFile | undefined = readJSON(
        join(historyDir, `${deal.productId}.json`),
      );
      if (history && history.url) {
        deal.canadianTireUrl = `https://www.canadiantire.ca${history.url}`;
      }
      deal.tirespyUrl = `https://tirespy.ca/product/${deal.productId}`;

      gouges.push(deal);
    }
  }

  if (gouges.length > 0) {
    console.log("⚠️  POTENTIAL PRICE GOUGES DETECTED");
    console.log("═".repeat(101));
    console.log(
      padRight("Product", 45) +
        padRight("ID", 12) +
        padRight("Sale", 11) +
        padRight("Max", 11) +
        padRight("Avg", 11) +
        "Diff",
    );
    console.log("─".repeat(101));

    for (const deal of gouges) {
      const diff = deal.salePrice! - deal.maxHistoricalPrice!;
      console.log(
        padRight(deal.productName.substring(0, 44), 45) +
          padRight(deal.productId, 12) +
          padRight(`$${deal.salePrice!.toFixed(2)}`, 11) +
          padRight(`$${deal.maxHistoricalPrice!.toFixed(2)}`, 11) +
          padRight(`$${deal.averageHistoricalPrice!.toFixed(2)}`, 11) +
          `+$${diff.toFixed(2)}`,
      );
      console.log(`  CT:      ${deal.canadianTireUrl ?? "N/A"}`);
      console.log(`  TireSpy: ${deal.tirespyUrl}`);
    }
    console.log("─".repeat(101));
    console.log(
      `Found ${gouges.length} item(s) on "sale" above their historical maximum.\n`,
    );
  } else {
    console.log(
      "✅ No price gouges detected — all sale prices are at or below their historical maximum.\n",
    );
  }

  writeJSON("weekly-deals.json", deals);
  console.log(
    `\nAugmented ${augmented} of ${deals.length} deals with average historical price.`,
  );
}
