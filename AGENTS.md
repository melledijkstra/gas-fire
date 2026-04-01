## Versioning Guidelines
- Whenever you modify code in `src/`, you must bump the version in `package.json`.
- Update the version by changing the package.json. Respect semantic versioning rules when updating the version number. For beta versions, use the format `X.Y.Z-beta` where `X` is the major version, `Y` is the minor version, and `Z` is the patch version. For example, if you are making a bug fix to version 4.2.0-beta, you would update the version to 4.2.1-beta.
- Use `patch` for bug fixes and `minor` for new features and `major` for breaking changes.
- Add relevant information about the change in the `CHANGELOG.md` file using the format shown in the existing entries. Include a brief description of the change and its impact on users or developers. For breaking changes, clearly indicate the nature of the change and any necessary migration steps for users.
