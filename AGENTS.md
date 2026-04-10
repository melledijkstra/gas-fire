# Agent Onboarding Guide: gas-fire

## Role & Purpose

`gas-fire` automates a **Financial Independence, Retire Early (FIRE) Google Sheet**. It provides:

- A multi-step **transaction import pipeline**: CSV upload → duplicate detection & validation → auto-categorization → batch insert.
- A **Svelte-based dialog UI** that runs inside Google Sheets as a sidebar/modal.
- A **Google Apps Script (GAS) backend** that reads/writes the FIRE spreadsheet and exposes RPC functions to the client.

The target user is someone managing personal finances in a structured Google Sheet with a fixed column schema.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend runtime | Google Apps Script (V8, ES2019 target) |
| Backend language | TypeScript (strict mode) |
| Frontend framework | Svelte 5 (Runes API only) |
| Styling | Tailwind CSS 4, Flowbite Svelte |
| Bundler | Vite |
| GAS deployment | `@google/clasp` |
| Client↔Server RPC | `gas-client` |
| CSV parsing | PapaParse |
| Test runner | Vitest |
| Linter | ESLint + TypeScript ESLint + `@stylistic/eslint-plugin` |
| Dead code detection | Knip |

---

## Domain Knowledge

### Core Entities

- **`FireTransaction`** — A 16-column record: `ref`, `iban`, `contra_iban`, `date`, `import_date`, `amount`, `balance`, `currency`, `contra_account`, `description`, `comments`, `category`, `label`, `icon`, `hours`, `disabled`. Defined in `src/common/types.ts`.
- **`FireTable`** — Domain-aware in-memory table aligned to the FIRE column schema. Extends `Table`.
- **`FireSheet`** — Spreadsheet I/O wrapper around the GAS `Sheet` API. Handles reading/writing `FireTransaction` rows.
- **`Table`** — Generic in-memory table with a builder-style API (chainable transforms: `sortByColumn`, `removeEmptyRows`, `transpose`, etc.).
- **`Config`** — Per-account import configuration (column mappings, auto-fill rules, feature flags). Cached at document level.
- **`ServerResponse<T>`** — Discriminated union for all RPC responses: `EmptyServerResponse | ErrorServerResponse | PayloadServerResponse<T>`. Defined in `src/common/types.ts`.

### Business Concepts

- **Import Pipeline:** User uploads a CSV for a specific bank account. The server maps CSV columns to FIRE columns (using account `Config`), hashes rows for deduplication against recent sheet data, runs auto-categorization, and returns an `ImportPreviewReport`. The user reviews, overrides categories/skips, then triggers the final insert.
- **Deduplication:** O(N) hash comparison on `{ iban, amount, contra_account, description }`. Hashes the last N rows of the FIRE sheet and flags matches in the preview.
- **Auto-categorization:** Text analysis of `description` and `contra_account` against user-defined category-to-term mappings stored in the sheet config. Lives in `src/server/category-detection/`.
- **RPC boundary:** The GAS backend exposes named functions via `src/server/index.ts`. The Svelte client calls them through the `serverFunctions` proxy (`src/client/utils/serverFunctions.ts`), which uses `gas-client` under the hood.
- **API Optimization:** Preferably use the Sheets API for operations on the Google Sheets document for better performance. If the Sheets API is not available, fall back to using the Apps Script API.

---

## Core Directories

```plaintext
src/
├── client/                  # Svelte dialogs (compiled to single-file HTML by Vite)
│   ├── import-dialog/       # 3-step import wizard (upload → preview → execute)
│   ├── about-dialog/        # Version/info dialog
│   ├── components/          # Reusable Svelte components
│   ├── states/              # Svelte 5 rune-based global state (.svelte.ts files)
│   └── utils/               # Client utilities (serverFunctions RPC proxy, error handling)
├── server/                  # GAS backend (compiled to single IIFE by Vite)
│   ├── accounts/            # Bank account CRUD and validation
│   ├── category-detection/  # Auto-categorization logic and term mappings
│   ├── deduplication/       # Hash-based duplicate detection
│   ├── import-pipeline/     # Main import orchestration (core business logic)
│   ├── table/               # Table, FireTable, FireSheet abstractions
│   ├── parsers/             # Date and money parsing (locale-aware)
│   ├── ui/                  # GAS menu setup (onOpen), dialog launchers
│   └── index.ts             # Barrel: exports all public RPC functions
├── common/                  # Shared between client and server
│   ├── types.ts             # FireTransaction, ServerResponse, shared interfaces
│   ├── constants.ts         # FIRE_COLUMNS, NAMED_RANGES, SOURCE_SHEET_ID
│   ├── helpers.ts           # slugify(), structuredClone()
│   └── logger.ts            # Logger utility
├── fixtures/                # Mock data and factory helpers for tests
├── plugins/                 # Custom Vite plugins for GAS bundling
└── stories/                 # Storybook component stories
scripts/                     # Dev utilities: switch-env.ts, faker.ts
```

---

## Entry Points

- **GAS backend:** `src/server/index.ts` — re-exports all RPC functions. Vite bundles this to `dist/server.js` (IIFE, ES2019). GAS calls exported functions by name.
- **GAS menu:** `src/server/ui/rpc.ts` → `onOpen()` — called by GAS when the sheet opens; installs the "FIRE" menu.
- **Import dialog:** `src/client/import-dialog/index.html` — Vite entry for the import wizard. Bundled to `dist/import-dialog.html` (single-file HTML via `vite-plugin-singlefile`).
- **About dialog:** `src/client/about-dialog/index.html` → `dist/about-dialog.html`.

---

## Shell Commands

```bash
# Install dependencies
pnpm install

# Run tests (watch mode)
pnpm test

# Run tests once with coverage
pnpm test:coverage

# Type check (no emit)
pnpm typecheck

# Lint (check)
pnpm lint

# Lint (auto-fix)
pnpm lint:fix

# Find unused exports/dependencies
pnpm knip

# Local CI (lint + build + test — run before opening a PR)
pnpm local:ci

# Build + push to GAS (development)
pnpm release:dev

# Build + push to GAS (production)
pnpm release

# Start local Vite dev server (after build + push)
pnpm dev

# Switch deployment environment (dev/prod)
pnpm switch-env <env>
```

---

## Code Style & Patterns

### TypeScript

- **Strict mode is non-negotiable.** No `any`. No `// @ts-ignore`. Use discriminated unions, generics, and `import type` for type-only imports.
- Path alias `@/*` maps to `src/*`. Always use it for cross-module imports.
- Unused variables must be prefixed with `_` (ESLint enforced).

### Naming

| Construct | Convention | Example |
| --- | --- | --- |
| Variables, functions, methods | `camelCase` | `getBankAccounts`, `removeEmptyRows` |
| Classes, types, interfaces | `PascalCase` | `FireTable`, `ServerResponse` |
| Module-level constants | `UPPER_SNAKE_CASE` | `FIRE_COLUMNS`, `SOURCE_SHEET_ID` |
| FIRE column keys | `snake_case` | `contra_account`, `import_date` |
| Test files | colocated, `.test.ts` suffix | `Table.test.ts` next to `Table.ts` |
| Svelte state files | `.svelte.ts` suffix | `import.svelte.ts` |

### Architecture Preferences

- **Prefer readability over cleverness.** A clear 3-line solution beats a 1-line trick.
- **Encapsulate GAS API access in `FireSheet` and `FireTable`.** Never call `SpreadsheetApp` directly in business logic.
- **All RPC functions return `ServerResponse<T>`.** Never throw from an RPC function — catch and return `{ success: false, error: string }`.
- **Server state is stateless per call.** Use `Config` (document-cached) for cross-call persistence.
- **Builder pattern for data transforms.** Chain `Table` methods instead of imperative loops.
- **Svelte 5 Runes only.** Use `$state`, `$derived`, `$props`, `$effect`. No Svelte 4 reactive syntax (`$:`, `export let`).
- **Client RPC only via `serverFunctions` proxy.** Never call `google.script.run` directly.

### File Organization

- Each feature module under `src/server/` gets its own directory with a `rpc.ts` for public endpoints and supporting files.
- Barrel exports via `index.ts` at directory boundaries.
- Tests colocated with source files.

---

## PR Requirements (Definition of Done)

- [ ] `pnpm local:ci` passes (lint + build + tests)
- [ ] `pnpm typecheck` passes with no errors
- [ ] New behavior covered by unit tests in the colocated `.test.ts` file
- [ ] No `any` types introduced
- [ ] No new unused exports (`pnpm knip` clean)
- [ ] No direct GAS API calls outside of `src/server/table/` or `src/server/utils/`
- [ ] `ServerResponse<T>` used for all new RPC functions

---

## Gold Standard Files

| File | Why it's exemplary |
| --- | --- |
| `src/server/table/Table.ts` | Clean generic class with builder pattern, static factory methods, immutable `.clone()`, grouped sections (accessors / mutations / statics), and thorough inline docs. |
| `src/server/import-pipeline/rpc.ts` | Ideal RPC module: typed `ServerResponse<T>` returns, error isolation with try/catch, pure helper functions, no direct GAS API calls, composed from domain classes. |
