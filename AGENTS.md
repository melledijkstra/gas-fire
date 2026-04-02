# AGENTS.md

Instructions for Agents Working on the GAS FIRE project should follow these guidelines to ensure consistency and maintainability across the codebase.

## Coding Environment
- Use pnpm as the package manager and command executor for this project.
- Use TypeScript for all code in the `src/` directory.
- Use Svelte for all client-side components in the `src/client/` directory.
- Use Vite as the build tool and development server for the project.
- Follow the existing code style and conventions used in the project for consistency.

## Versioning Guidelines
- Whenever you modify code in `src/` and version has not yet been bumped in this branch, then you must bump the version in `package.json`.
- Update the version by changing the package.json. Respect semantic versioning rules when updating the version number. For beta versions, use the format `X.Y.Z-beta` where `X` is the major version, `Y` is the minor version, and `Z` is the patch version. For example, if you are making a bug fix to version 4.2.0-beta, you would update the version to 4.2.1-beta.
- Use `patch` for bug fixes and `minor` for new features and `major` for breaking changes.
- Add relevant information about the change in the `CHANGELOG.md` file using the format shown in the existing entries. Include a brief description of the change and its impact on users or developers. For breaking changes, clearly indicate the nature of the change and any necessary migration steps for users.

## Google App Script Guidelines
- Preferably use the Sheets API for operations on the Google Sheets document for better performance. If the Sheets API is not available, fall back to using the Apps Script API.