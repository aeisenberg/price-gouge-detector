import { scrapeWeeklyDeals } from "./scrape-weekly-deals.js";
import { fetchPriceHistories } from "./fetch-price-history.js";
import { computeAveragePrices } from "./compute-average-price.js";

async function main(): Promise<void> {
  console.log("=== Price Gouge Detector ===\n");

  console.log("Step 1: Scraping weekly deals from Canadian Tire...");
  await scrapeWeeklyDeals();

  console.log("\nStep 2: Fetching price history from TireSpy...");
  await fetchPriceHistories();

  console.log("\nStep 3: Computing average prices and detecting gouges...");
  computeAveragePrices();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
