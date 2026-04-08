# Changelog

## 4.14.2-beta

- **Refactor** - Removed unnecessary comments explaining clear code in `importPipeline` RPC file to improve code readability and maintainability.

## 4.14.1-beta

- **Performance** - Replace redundant `SpreadsheetApp.getActiveSpreadsheet()` with `FireSpreadsheet` in config load to eliminate an unnecessary Google Apps Script RPC call.

## 4.14.0-beta

- **Feature** - Enhanced Import Preview with Transparency & Control.
  - The preview step now calculates transaction status (e.g. 'valid', 'duplicate', 'removed').
  - The unified data table visually differentiates status (e.g. duplicate rows are highlighted).
  - Users can now explicitly override the action for duplicate rows (Skip vs. Force Import) via a new inline dropdown.
  - The final import execution respects these user decisions during processing.
  - Extracted the duplicate hash logic into `duplicate-finder.ts` and introduced `ImportPreviewReport` types.
- **Performance** - Refactored standalone `findDuplicates` from O(N²) to O(N) using Map-based hash grouping, consistent with `FireTable.findDuplicates`.

## 4.12.0-beta

- **New: `Table` class** - Generic in-memory table abstraction with mutable builder-pattern operations (`transpose()`, `removeEmptyRows()`, `deleteColumns()`, `sortByColumn()`, `clone()`) and static utilities. Replaces scattered `TableUtils` static methods.
- **New: `FireTable` class** - Extends `Table` with FIRE column-aware operations: `getFireColumn()`, `sortByDate()`, `findDuplicates()`, `categorize()`, and a `FireTable.fromCSV()` factory that replaces `processInputDataAndShapeFiresheetStructure()`.
- **New: `FireSheet` class** - Wraps the FIRE source Google Sheet, encapsulating all sheet I/O (`importData()`, `getData()`, `activate()`, `getFilter()`, `setValues()`). Separates sheet interaction from data manipulation.
- **Renamed `Table` type to `RawTable`** - The `string[][]` type alias used for client-server data transfer has been renamed to `RawTable` to avoid naming collision with the new `Table` class and to better describe its purpose.
- **New: `CellValue` type** - Introduced `CellValue = string | number | Date | boolean | null` to accurately represent cell data during processing, replacing the inaccurate `string[][]` for server-side table operations.
- **Removed `TableUtils` class and `table-utils.ts`** - All functionality has been migrated to the new `Table`, `FireTable`, and `FireSheet` classes with improved separation of concerns (SRP).
- **Full migration** - All server modules (`importer`, `category-detection`, `other`, `request-builder`) and their tests have been updated to use the new classes.

## 4.11.0-beta

- **Feature** - Added Smart Duplicate Transaction Detection on Import Preview.
  - The import preview now compares incoming transactions against the last imported batch.
  - Duplicates are detected by hashing 'iban', 'amount', 'contra_account', and 'description'.
  - Matching duplicate rows in the UI are visually highlighted with a "Duplicate Detected" badge to prevent accidental re-imports.

## 4.10.1-beta

- **Bug fix** - Empty strings in uploaded file columns are now mapped to `null` to avoid empty strings in Google Sheet cells, which ensures proper data formatting.

## 4.2.0-beta

- **Migration from npm to pnpm** - Repository now uses pnpm as the package manager instead of npm. All scripts and CI/CD workflows have been updated accordingly.

## 4.1.2-beta

- ESLint setup + CI flow
- Enhanced `structuredCloneFallback` to support Date, Map, Set, and RegExp types, add related tests, update logger parameter types, refine ESLint configuration

## 4.0.0-beta

- Refactored all UI code to use flowbite + setup Google Sheets green theme for flowbite
- Added flowbite-svelte as UI library build on top of tailwindcss
- Storybook fixed

## 4.0.0-alpha

- Ported all code from React to Svelte
- WIP: Storybook broken, not yet working

## 3.3.0

- Added duplicate finder which can find duplicate rows from the source sheet given a timeframe
- Added more information to the README to make setting up the project easier

## 3.2.3

- Upgrade to React v19
  - Upgrade @mui/material to v6.4.7 to be compatible with react@19
  - Removed UMD CDN imports which are not supported anymore. ES versions not needed because React 19 + Vite is fast enough and bundle is small enough.
- Upgrade vite & vitest
- Upgrade all minor & patches
- Upgraded storybook + fix import stories

## 3.2.2

- Moved storybook stories to their own folder

## 3.2.1

- Removed babel

## 3.2.0

- Added function that mails net worth to spreadsheet owner, can be setup as trigger

## 3.1.1

#### Developer

- Added script and command `npm run switch-env [env]` to switch between testing and production Google App Script project IDs. This is helpful during development to have an Google Sheets document which can be modified by the project without hurting the original document.
- Added server function to retrieve project version

## 3.1.0

#### Users

- Removed external table packages and using Mui components instead to build a custom table which seemed to be way easier.
- Users can now see a nicer table when importing their data with checkboxes to choose which transactions should not be imported (feedback to user still pending).
- A preview table is also placed inside another tab to preview the transactions before importing them
- About dialog now shows current version of this project. This is helpful when distributing the Google Sheet in the future.

#### Developer

- Added '@' alias in vite to refer to the root of the project and can be used when importing e.g. `@/client/**` or `@/server/**`
- Added `__APP_VERSION__` through vite define in order to receive the current version

## 3.0.0

- **Breaking Change**: Migration from Webpack to Vite
  - Storybook converted to use vite

## 2.0.0

- No history... sorry

## 1.0.0

- Initial release, no history... sorry
