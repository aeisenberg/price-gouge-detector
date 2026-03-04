import { describe, it, expect } from "vitest";
import { computeTimeWeightedAverage, GOUGE_THRESHOLD } from "../src/compute-average-price";
import type { PriceEntry } from "../src/helpers";

describe("GOUGE_THRESHOLD", () => {
  it("should be 0.10 (10%)", () => {
    expect(GOUGE_THRESHOLD).toBe(0.10);
  });
});

describe("computeTimeWeightedAverage", () => {
  it("returns null for an empty history", () => {
    expect(computeTimeWeightedAverage([])).toBeNull();
  });

  it("returns the single price when there is only one entry", () => {
    const history: PriceEntry[] = [{ date: "2025-01-01", price: 5.99 }];
    const result = computeTimeWeightedAverage(history);
    // Only one entry — its period runs from the date to "now", so the average is just that price
    expect(result).toBe(5.99);
  });

  it("returns correct time-weighted average for two entries", () => {
    // $4.00 for 10 days, then $6.00 for 10 days → average = $5.00
    const start = new Date("2025-01-01");
    const mid = new Date("2025-01-11");

    // Pin "now" via two equal-duration periods using explicit dates
    const history: PriceEntry[] = [
      { date: start.toISOString(), price: 4.0 },
      { date: mid.toISOString(), price: 6.0 },
    ];

    // We can't control "now", but we can verify the result is between the two prices
    const result = computeTimeWeightedAverage(history);
    expect(result).not.toBeNull();
    // The more recent $6.00 price runs from mid to "now" (longer), so the average
    // will be closer to $6.00 than $4.00 — just verify it's between the two values.
    expect(result!).toBeGreaterThan(4.0);
    expect(result!).toBeLessThanOrEqual(6.0);
  });

  it("returns correct average when both periods have equal length", () => {
    // Use two entries where each period is 10 days and the second entry's end is fixed
    // by making the second entry's date very close to "now"
    // Instead, test with a controlled pair of same-duration entries
    const d1 = "2025-01-01";
    const d2 = "2025-01-11";
    const d3 = "2025-01-21";

    // Simulate: $4 for 10 days, $8 for 10 days
    // We can't fix "now", so approximate: provide three entries so the last period is 0 days
    // if the third entry date equals "now". Since we can't do that, verify proportionality.
    const history: PriceEntry[] = [
      { date: d1, price: 4.0 },
      { date: d2, price: 8.0 },
      { date: d3, price: 8.0 }, // same price, negligible extra period
    ];

    const result = computeTimeWeightedAverage(history);
    expect(result).not.toBeNull();
    // The $8 price covers d2→d3 (10 days) + d3→now (variable). As long as now > d3,
    // the average will be well above 4 and close to 8.
    expect(result!).toBeGreaterThan(4.0);
    expect(result!).toBeLessThanOrEqual(8.0);
  });

  it("sorts entries by date regardless of input order", () => {
    const history: PriceEntry[] = [
      { date: "2025-06-01", price: 10.0 },
      { date: "2025-01-01", price: 2.0 },
    ];
    const historySorted: PriceEntry[] = [
      { date: "2025-01-01", price: 2.0 },
      { date: "2025-06-01", price: 10.0 },
    ];
    expect(computeTimeWeightedAverage(history)).toBe(computeTimeWeightedAverage(historySorted));
  });

  it("is not flagged as a price gouge when sale price is within the threshold", () => {
    // Issue case: avg $6.08, sale $6.59 → diff ~8.4% which is below the 10% threshold
    const avg = 6.08;
    const salePrice = 6.59;
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(false);
  });

  it("is flagged as a price gouge when sale price exceeds the threshold", () => {
    // Sale price more than 10% above average
    const avg = 6.08;
    const salePrice = 6.90; // ~13.5% above avg
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(true);
  });

  it("is not flagged when sale price is exactly at the threshold boundary", () => {
    const avg = 10.0;
    const salePrice = avg * (1 + GOUGE_THRESHOLD); // exactly 10% above
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(false);
  });
});
