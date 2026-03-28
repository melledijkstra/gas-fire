The problem is that the errors thrown in the backend logic (e.g. `throw new Error(...)` in `importer/rpc.ts`) might cause standard GAS error alerts or unhandled rejections that are difficult to handle on Svelte frontend or provide ugly error messages. We want a structured response that indicates success or failure with a localized/readable error message.

Currently, if I throw an Error in GAS, `google.script.run` will catch it and invoke the failure handler (`.catch(onFailure)`). The error object might be a generic JS Error. We want to avoid throwing uncaught errors and instead return a standard object.

Let's modify `ServerResponse`:
```typescript
export type ServerResponse<T = undefined> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};
```

Let's modify `src/server/importer/rpc.ts`:
```typescript
export function importCSV(
  inputTable: Table,
  bankAccount: string
): ServerResponse {
  try {
    // ... logic
    return {
      success: true,
      message: msg,
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export function generatePreview(
  table: Table,
  bankAccount: string
): ServerResponse<{ result: Table; newBalance?: number }> {
  try {
    // ... logic
    return {
      success: true,
      data: { result: table, newBalance }
    }
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
```

Wait! Is `getBankAccountOptionsCached` also throwing errors? Let's check `src/server/accounts/rpc.ts`:
```typescript
export function getBankAccountOptionsCached(): ServerResponse<Record<string, string>> {
  try {
    const cache = CacheService.getDocumentCache();
    // ... logic
    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
```
Wait, `getBankAccountOptions` and `getBankAccounts` could also be wrapped to return `ServerResponse`.
But wait, `getBankAccountOptionsCached` returning `ServerResponse` means the frontend has to unpack it. Let's look at `ImportForm.svelte`:
```typescript
    serverFunctions
      .getBankAccountOptionsCached()
      .then((response) => {
        if (response.success && response.data) {
          strategyOptions = response.data;
        } else {
          onFailure({ success: false, error: response.error });
        }
      })
      // ...
```

Wait, `ServerResponse` in `types.ts` could be simplified to:
```typescript
export type ServerResponse<T = undefined> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};
```
But `ServerResponse` is already used like this in `ImportForm.svelte`:
```typescript
const onFailure = (error: ServerResponse | string) => alert(`Action failed! ${typeof error === 'string' ? error : error?.error || error?.message}`);
```
Let's see the current frontend usage of `importCSV`:
```typescript
    serverFunctions
      .importCSV(data, importStrategy)
      .then((res) => {
        if (!res.success) {
           onFailure(res);
           return;
        }
        google.script.host.close()
      })
      .catch(onFailure)
```
Wait, if `importCSV` doesn't throw but returns `{ success: false, error: "..." }`, then the `.then` block will receive it. So we must check `res.success` inside `.then`.

Let's check what files call `importCSV`. `src/client/components/ImportForm.svelte`.
Let's check what calls `generatePreview`. `src/client/components/PreviewTable.svelte`.
Let's check what calls `getBankAccountOptionsCached`. `src/client/components/ImportForm.svelte`.
