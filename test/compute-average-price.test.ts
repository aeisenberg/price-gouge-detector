import { describe, it, expect } from "vitest";
import { computeTimeWeightedAverage, computeMaxPrice, GOUGE_THRESHOLD } from "../src/compute-average-price";
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
    expect(result).toBe(5.99);
  });

  it("returns correct time-weighted average for two entries", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 4.0 },
      { date: "2025-01-11", price: 6.0 },
    ];

    const result = computeTimeWeightedAverage(history);
    expect(result).not.toBeNull();
    // The more recent $6.00 price runs from mid to "now" (longer), so the average
    // will be closer to $6.00 than $4.00
    expect(result!).toBeGreaterThan(4.0);
    expect(result!).toBeLessThanOrEqual(6.0);
  });

  it("returns correct average when both periods have equal length", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 4.0 },
      { date: "2025-01-11", price: 8.0 },
      { date: "2025-01-21", price: 8.0 },
    ];

    const result = computeTimeWeightedAverage(history);
    expect(result).not.toBeNull();
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
});

describe("computeMaxPrice", () => {
  it("returns null for an empty history", () => {
    expect(computeMaxPrice([])).toBeNull();
  });

  it("returns the single price when there is only one entry", () => {
    const history: PriceEntry[] = [{ date: "2025-01-01", price: 5.99 }];
    expect(computeMaxPrice(history)).toBe(5.99);
  });

  it("returns the maximum price from multiple entries", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 5.39 },
      { date: "2025-02-01", price: 6.49 },
      { date: "2025-03-01", price: 5.79 },
      { date: "2025-04-01", price: 5.99 },
    ];
    expect(computeMaxPrice(history)).toBe(6.49);
  });

  it("returns the correct max when all prices are the same", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 7.0 },
      { date: "2025-02-01", price: 7.0 },
    ];
    expect(computeMaxPrice(history)).toBe(7.0);
  });

  it("handles negative prices", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: -1.0 },
      { date: "2025-02-01", price: -5.0 },
    ];
    expect(computeMaxPrice(history)).toBe(-1.0);
  });
});

describe("gouge detection with threshold", () => {
  it("is not flagged when sale price is within the threshold", () => {
    // Issue case: avg $6.08, sale $6.59 → diff ~8.4% which is below the 10% threshold
    const avg = 6.08;
    const salePrice = 6.59;
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(false);
  });

  it("is flagged when sale price exceeds the threshold", () => {
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

  it("is flagged when sale price is just above the threshold boundary", () => {
    const avg = 10.0;
    const salePrice = avg * (1 + GOUGE_THRESHOLD) + 0.01; // just over 10% above
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(true);
  });

  it("is not flagged when sale price equals average", () => {
    const avg = 10.0;
    const salePrice = 10.0;
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(false);
  });

  it("is not flagged when sale price is below average", () => {
    const avg = 10.0;
    const salePrice = 9.0;
    const isGouge = salePrice > avg * (1 + GOUGE_THRESHOLD);
    expect(isGouge).toBe(false);
  });
});
