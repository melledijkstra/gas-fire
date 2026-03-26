## Versioning Guidelines
- Whenever you modify code in `src/`, you must bump the version in `package.json`.
- ALWAYS use `npm version <patch|minor|major|specific version>` instead of editing the file manually.
- This ensures `package-lock.json` stays in sync.
- Use `patch` for bug fixes and `minor` for new features.
