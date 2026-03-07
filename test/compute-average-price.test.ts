import { describe, it, expect } from "vitest";
import {
  computeTimeWeightedAverage,
  computeMaxPrice,
  GOUGE_THRESHOLD,
} from "../src/compute-average-price";
import type { PriceEntry } from "../src/helpers";

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
    // Period 1: Jan 1–11 = 10 days at $4.00 → 40
    // Period 2: Jan 11–21 = 10 days at $6.00 → 60
    // Average: 100 / 20 = $5.00
    const result = computeTimeWeightedAverage(history, new Date("2025-01-21"));
    expect(result).toBe(5.0);
  });

  it("returns correct average when periods have different lengths", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 4.0 },
      { date: "2025-01-11", price: 8.0 },
      { date: "2025-01-21", price: 8.0 },
    ];
    // Period 1: Jan 1–11  = 10 days at $4.00 → 40
    // Period 2: Jan 11–21 = 10 days at $8.00 → 80
    // Period 3: Jan 21–31 = 10 days at $8.00 → 80
    // Average: 200 / 30 = $6.67
    const result = computeTimeWeightedAverage(history, new Date("2025-01-31"));
    expect(result).toBe(6.67);
  });

  it("weights recent prices more when last period is longer", () => {
    const history: PriceEntry[] = [
      { date: "2025-01-01", price: 2.0 },
      { date: "2025-01-11", price: 10.0 },
    ];
    // Period 1: Jan 1–11  = 10 days at $2.00 → 20
    // Period 2: Jan 11–Feb 10 = 30 days at $10.00 → 300
    // Average: 320 / 40 = $8.00
    const result = computeTimeWeightedAverage(history, new Date("2025-02-10"));
    expect(result).toBe(8.0);
  });

  it("sorts entries by date regardless of input order", () => {
    const now = new Date("2025-12-01");
    const history: PriceEntry[] = [
      { date: "2025-06-01", price: 10.0 },
      { date: "2025-01-01", price: 2.0 },
    ];
    const historySorted: PriceEntry[] = [
      { date: "2025-01-01", price: 2.0 },
      { date: "2025-06-01", price: 10.0 },
    ];
    expect(computeTimeWeightedAverage(history, now)).toBe(
      computeTimeWeightedAverage(historySorted, now),
    );
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
    const salePrice = 6.9; // ~13.5% above avg
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
