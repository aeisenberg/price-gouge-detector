import * as path from "path";
import { type WeeklyDeal, readJSON, writeJSON } from "./helpers";

const TIRESPY_BASE =
  "https://storage.googleapis.com/winged-record-376000.appspot.com/json/en_CA/products";

// Use a consistent set of headers to mimic a real browser and avoid potential blocking by the server.
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Origin: "https://tirespy.ca",
  "Sec-GPC": "1",
  Connection: "keep-alive",
  Referer: "https://tirespy.ca/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
};

async function fetchPriceHistory(productId: string): Promise<unknown | null> {
  // TireSpy uses lowercase product IDs
  const url = `${TIRESPY_BASE}/${productId.toLowerCase()}.json`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPriceHistories(): Promise<void> {
  const deals: WeeklyDeal[] | undefined = readJSON("weekly-deals.json");
  if (!deals) {
    console.log("No weekly deals found. Please run the scraper first.");
    return;
  }

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];

    process.stdout.write(
      `[${i + 1}/${deals.length}] ${deal.productId} ${deal.productName.substring(0, 50)}... `
    );

    const data = await fetchPriceHistory(deal.productId);

    if (data) {
      const fullPath = writeJSON(path.join("price-history", `${deal.productId}.json`), data);
      console.log("✓, saved to", fullPath);
      found++;
    } else {
      console.log("✗ not found");
      notFound++;
    }

    // Small delay between requests to be polite
    if (i < deals.length - 1) {
      await delay(200);
    }
  }

  console.log(
    `\nDone. Found: ${found}, Not found: ${notFound}, Total: ${deals.length}`
  );
}
