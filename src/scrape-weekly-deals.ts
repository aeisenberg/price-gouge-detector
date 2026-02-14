import { chromium, type Page } from "playwright";
import { type PriceApiProduct, type SearchApiProduct, type SearchApiResponse, type WeeklyDeal, writeJSON } from "./helpers";


async function fetchDeals(): Promise<WeeklyDeal[]> {
  const dealsMap = new Map<string, WeeklyDeal>();
  const searchProducts: SearchApiProduct[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page: Page = await context.newPage();

  // Intercept search API responses to capture product names and IDs
  page.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";
    if (!ct.includes("json")) return;

    try {
      if (url.includes("/v1/search/")) {
        const json = (await response.json()) as SearchApiResponse;
        if (json.products) searchProducts.push(...json.products);
      }
    } catch {
      // Response may not be parseable
    }
  });

  console.log("Loading weekly deals page...");
  await page.goto(
    "https://www.canadiantire.ca/en/promotions/weekly-deals.html",
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );

  console.log("Waiting for products to load...");
  await page.waitForSelector('[data-testid^="product-card-container"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Build deals from search API data (has names + IDs)
  if (searchProducts.length > 0) {
    console.log(
      `Captured ${searchProducts.length} products from search API.`
    );
    for (const product of searchProducts) {
      const id = product.code ?? "Unknown";
      dealsMap.set(id, {
        productName: product.title ?? "Unknown",
        productId: id,
        salePrice: null,
        regularPrice: null,
      });
    }

    // Fetch prices via the PriceAvailability API from within the browser
    // context (to inherit cookies and avoid Akamai blocks).
    const allCodes = searchProducts
      .map((p) => p.code)
      .filter((c): c is string => !!c);

    const batchSize = 25;
    for (let i = 0; i < allCodes.length; i += batchSize) {
      const batch = allCodes.slice(i, i + batchSize);
      console.log(
        `Fetching prices for products ${i + 1}–${i + batch.length}...`
      );

      const batchPrices = await page.evaluate(async (codes: string[]) => {
        const resp = await fetch(
          "https://apim.canadiantire.ca/v1/product/api/v1/product/product/PriceAvailability?lang=en_CA&storeId=480",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "Ocp-Apim-Subscription-Key":
                "c01ef3612328420c9f5cd9277e815a0e",
              bannerid: "CTR",
              baseSiteId: "CTR",
              "x-web-host": "www.canadiantire.ca",
              "service-client": "ctr/web",
              "service-version": "v1",
            },
            body: JSON.stringify({
              products: codes.map((code) => ({ code, brand: "" })),
              skus: [],
            }),
          }
        );
        const json = await resp.json();
        return json.products ?? [];
      }, batch);

      for (const pp of batchPrices as PriceApiProduct[]) {
        const id = pp.code ?? "";
        const existing = dealsMap.get(id);
        if (existing) {
          existing.salePrice = pp.currentPrice?.value ?? null;
          existing.regularPrice = pp.originalPrice?.value ?? null;
        }
      }
    }
  } else {
    // Fallback: scrape the rendered DOM
    console.log("Falling back to DOM scraping...");
    const cards = await page.$$('.nl-product__grid-items .nl-product__content');
    for (const card of cards) {
      const name = await card
        .$eval(".nl-product-card__title", (el) => el.textContent?.trim())
        .catch(() => null);
      const saleText = await card
        .$eval('[data-testid="priceTotal"]', (el) => el.textContent?.trim())
        .catch(() => null);
      const wasText = await card
        .$eval(".nl-price--was s", (el) => el.textContent?.trim())
        .catch(() => null);
      const href = await card
        .$eval("a[href*='/pdp/']", (el) => el.getAttribute("href"))
        .catch(() => null);

      const idMatch = href?.match(/(\d{7}[A-Z]?)/i);
      const productId = idMatch ? idMatch[1].toUpperCase() : "Unknown";

      if (name) {
        dealsMap.set(productId, {
          productName: name,
          productId,
          salePrice: saleText
            ? parseFloat(saleText.replace(/[^0-9.]/g, ""))
            : null,
          regularPrice: wasText
            ? parseFloat(wasText.replace(/[^0-9.]/g, ""))
            : null,
        });
      }
    }
  }

  await browser.close();
  return Array.from(dealsMap.values());
}

export async function scrapeWeeklyDeals(): Promise<void> {
  const deals = await fetchDeals();

  if (deals.length === 0) {
    throw new Error("No deals found. The page structure may have changed.");
  }

  const fullPath = writeJSON("weekly-deals.json", deals);
  console.log(`Saved ${deals.length} deals to ${fullPath}`);

}
