# Copilot Instructions for price-gouge-detector

## Project Overview

A TypeScript CLI tool that detects price gouging at Canadian Tire by comparing current sale prices against historical price data. If a "sale" price isn't meaningfully lower than historical prices, the tool flags it as a potential price gouge.

## Build, Test, and Lint

```bash
npm run build        # Compile TypeScript → dist/
npm run dev          # Run src/index.ts directly with tsx
npm run scrape       # Scrape weekly deals → weekly-deals.json
npm run test         # Run full test suite (vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without writing
```

Run a single test file:

```bash
npx vitest run test/some-file.test.ts
```

Run a single test by name:

```bash
npx vitest run -t "test name pattern"
```

## Architecture

- `src/` — Application source code (TypeScript, compiled to `dist/`)
- `test/` — Test files using Vitest (files named `*.test.ts`)

## Conventions

- **Module system**: ESM (`"type": "module"` in package.json, `"module": "NodeNext"` in tsconfig)
- **TypeScript**: Strict mode enabled. Target ES2022.
- **Testing**: Use Vitest with globals enabled — `describe`, `it`, `expect` are available without imports, but explicit imports from `"vitest"` are also fine.
- **Linting**: ESLint flat config (`eslint.config.mjs`) with typescript-eslint recommended rules.
- **Formatting**: Prettier for code formatting. Run `npm run format:check` to verify.
