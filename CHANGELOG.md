# Changelog

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
