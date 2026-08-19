xxx

# Price Gouge Detector

A TypeScript CLI tool that detects price gouging at Canadian Tire by comparing current "sale" prices against historical price data from [TireSpy](https://tirespy.com). If a sale price isn't actually lower than the product's historical average, it gets flagged as a potential price gouge.

## How It Works

The tool runs a 3-step pipeline:

1. **Scrape Weekly Deals** — Uses Playwright to scrape Canadian Tire's weekly deals page, collecting product names, IDs, and prices.
2. **Fetch Price Histories** — Pulls historical pricing data for each product from the TireSpy API and saves it locally.
3. **Detect Price Gouges** — Computes a time-weighted average from historical prices and flags any "sale" price that exceeds it.

Results are displayed in a formatted table showing the product, sale price, historical average, and links to both Canadian Tire and TireSpy.

## Setup

```bash
npm install
npx playwright install chromium
```

## Usage

Run the full pipeline:

```bash
npm run dev
```

Or run each step individually:

```bash
npm run scrape            # Step 1: Scrape weekly deals → weekly-deals.json
npm run fetch-history     # Step 2: Fetch price histories → price-history/
npm run compute-averages  # Step 3: Analyze and detect gouges
```

## Development

```bash
npm run build       # Compile TypeScript → dist/
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix lint issues
npm run test        # Run tests (Vitest)
npm run test:watch  # Run tests in watch mode
```
