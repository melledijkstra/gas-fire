1. Modify `src/common/types.ts`: Update `ServerResponse` to a generic type `export type ServerResponse<T = undefined> = { success: boolean; data?: T; message?: string; error?: string };`. Wait, actually, let's keep it simple. If we wrap everything, we should use a consistent format.

Wait! The user says: "Suggestion: Implement a standard `ServerResponse` wrapper for all `rpc.ts` (remote calls made from the frontend) that includes a success boolean and a localized error message to be displayed in the Svelte UI"

Let's look closely at `src/server/importer/rpc.ts`:
Currently `importCSV` returns `ServerResponse`.
Currently `generatePreview` returns `{ result: Table; newBalance?: number }`.

What if we make `ServerResponse<T = any>`?
```typescript
export type ServerResponse<T = undefined> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};
```

Wait, `getBankAccountOptionsCached` is not in `importer/rpc.ts`, but it's called from frontend `serverFunctions.getBankAccountOptionsCached()`. It returns `Record<string, string>`.

We should use a generic `ServerResponse<T = undefined>` and wrap everything.
But doing so for ALL rpc functions might break things unless we also modify the frontend files (`PreviewTable.svelte`, `ImportForm.svelte`).
And since `rpc.ts` files are exported to `index.ts` to be called by GASClient... wait, `executeAutomaticCategorization`, `openFileUploadDialog`, `openAboutDialog`, `openSettingsDialog`, `mailNetWorth`, `executeFindDuplicates`, `debugImportSettings`, `GET_PROJECT_VERSION`, `getBankAccounts`, `getBankAccountOptions`, `getBankAccountOptionsCached` are all `rpc.ts` exports.
Some of these are called from the GAS UI menu, e.g. `executeAutomaticCategorization`, `executeFindDuplicates`, `debugImportSettings`, `openFileUploadDialog` etc.
These menu functions don't return anything to the frontend because they are executed server-side via menu clicks. They can return void.
The user said: "Implement a standard `ServerResponse` wrapper for all `rpc.ts` (remote calls made from the frontend) that includes a success boolean and a localized error message to be displayed in the Svelte UI"

Let's check which RPC calls are made from the frontend.
`grep -r "serverFunctions\." src/client`
