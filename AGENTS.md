# Agent Guidelines

## Memory

- Always use `pnpm` instead of `npm` for this project.
- Start comments in lowercase.
- Use Runes API only for Svelte 5 state management.
- Keep functions small and focused. If a function's cognitive complexity exceeds 15, extract inner loops or complex conditional blocks into smaller, well-named helper functions.
- Preferably use the Sheets API for operations on the Google Sheets document for better performance. If the Sheets API is not available, fall back to using the Apps Script API.
- A clear 3-line solution beats a 1-line trick.
- Client RPC only via `serverFunctions` proxy. Never call `google.script.run` directly.

## Code Style Guidelines

- Strict mode is non-negotiable. No `any`. No `// @ts-ignore`. Use discriminated unions, generics, and `import type` for type-only imports.
- Path alias `@/*` maps to `src/*`. Always use it for cross-module imports.
- Unused variables must be prefixed with `_` (ESLint enforced).
- Nullish Coalescing Assignment: Prefer `??=` over simple `if (!x) x = ...` for cleaner initialization.
- Standard Number Methods: Prefer `Number.parseFloat()` and `Number.isNaN()` over the global `parseFloat()` and `isNaN()` for more robust and modern JS.

### Naming

| Construct                     | Convention                    | Example                               |
| ---                           | ---                           | ---                                   |
| Variables, functions, methods | `camelCase`                   | `getBankAccounts`, `removeEmptyRows`  |
| Classes, types, interfaces    | `PascalCase`                  | `FireTable`, `ServerResponse`         |
| Module-level constants        | `UPPER_SNAKE_CASE`            | `FIRE_COLUMNS`, `SOURCE_SHEET_ID`     |
| FIRE column keys              | `snake_case`                  | `contra_account`, `import_date`       |
| Test files                    | colocated, `.test.ts` suffix  | `Table.test.ts` next to `Table.ts`    |
| Svelte state files            | `.svelte.ts` suffix           | `import.svelte.ts`                    |

---

## Project Description

`gas-fire` automates a **Personal Finance Google Sheet**. It provides:

- A **transaction import pipeline**: File upload (CSV) → duplicate detection & rule engine → user review → batch insert.
- A **Svelte-based dialog UI** that runs inside Google Sheets as a dialog.
- A **Google Apps Script (GAS) backend** that reads/writes to the Google spreadsheet and exposes RPC functions to the client.

## Tech Stack

|          Layer          |                       Technology                        |
| ----------------------- | ------------------------------------------------------- |
| Backend runtime         | Google Apps Script (V8, ES2019 target)                  |
| Backend language        | TypeScript                                              |
| Frontend framework      | Svelte 5                                                |
| Styling                 | Tailwind CSS 4, Flowbite Svelte                         |
| Bundler                 | Vite                                                    |
| GAS deployment          | `@google/clasp`                                         |
| Client ↔ Server RPC     | `gas-client`                                            |
| CSV parsing             | PapaParse                                               |
| Test runner             | Vitest                                                  |
| Linter                  | ESLint + TypeScript ESLint + `@stylistic/eslint-plugin` |
| Dead code detection     | Knip                                                    |

---

## Domain Knowledge

### Business Concepts

- **Import Pipeline:** User uploads a CSV for a specific bank account. The server maps CSV columns to FIRE columns (using account `Config`), hashes rows for deduplication against recent sheet data, runs auto-categorization, and returns an `ImportPreviewReport`. The user reviews the data, then triggers the final insert.
- **Deduplication:** Hashing strategy is used to detect duplicate transactions already existing in the Google Sheet.
- **Rule Engine:** Configurable rules setup by the user in the Google Sheet containing conditions and specific actions to be applied on transactions during the import process.
- **RPC boundary:** The GAS backend exposes named functions via `src/server/index.ts`. The Svelte client calls them through the `serverFunctions` proxy (`src/client/utils/serverFunctions.ts`), which uses `gas-client` under the hood.

---

## Core Directories

```plaintext
src/
├── client/                  # Svelte dialogs (compiled to single-file HTML by Vite)
├── server/                  # GAS backend (compiled to single IIFE by Vite)
│   └── index.ts             # Barrel: exports all public RPC functions
├── common/                  # Shared between client and server
├── fixtures/                # Mock data and factory helpers for tests
└── stories/                 # Storybook component stories
scripts/                     # Development utilities
```

## Entry Points

- **Apps Script backend:** `src/server/index.ts` — re-exports all RPC functions. Vite bundles this to `dist/server.js` (IIFE, ES2019). GAS calls exported functions by name.
- **Dialogs:** `src/client/*-dialog/index.html` — Vite entry for dialog wizards. Bundled to `dist/*-dialog.html` (single-file HTML via `vite-plugin-singlefile`).

## Important Commands & Tools

```shell
# Find unused exports/dependencies
pnpm knip

# Local CI (lint + build + test — run before opening a PR)
pnpm local:ci

# Build + push to GAS (development which enables logging)
pnpm release:dev

# Switch deployment environment (selects which Google Apps Script project the release commands deploy to)
pnpm switch-env <env>
```

## PR Requirements (Definition of Done)

- [ ] `pnpm local:ci` passes (lint + build + tests)
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm knip` clean (no new unused exports)
- [ ] unit tests created for new code
