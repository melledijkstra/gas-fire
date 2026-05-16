# Setting Up Your Bank Accounts

Before you can import transactions, Firesheet needs to know which banks you use and how to read the files they provide. You do this in the `import-settings` tab of your spreadsheet.

## The `import-settings` Tab

This tab is the "brain" of the import process. Each column represents one of your bank accounts or credit cards.

### 1. Adding an Account
To add a new account, simply add a new column to the right of the existing ones. Give it a clear name at the top (e.g., "My Savings" or "Amex").

### 2. Column Mapping
This is the most important part! Every bank uses different names for their columns (some say "Amount", others say "Value"). You need to tell Firesheet which column from your bank's CSV matches the Firesheet's columns.

| Firesheet Column | Description |
| --- | --- |
| **date** | The date the transaction happened. |
| **amount** | The money spent or received (e.g. -10.50 or 100.00). |
| **contra_account**| The name of the person or shop you paid/received from. |
| **description** | The long text description or memo from the bank. |

> **Visual Suggestion**: [Screenshot of the `import-settings` tab showing how "Value" from a bank maps to "amount" in Firesheet]

### 3. Automation Settings
Under each bank, you can toggle two powerful features:
- **Auto fill columns**: Firesheet can automatically calculate values for specific columns after import.
- **Auto categorize**: Set this to `TRUE` if you want Firesheet to automatically tag transactions using your [Category Keywords](./categories).

## Finding Your IBAN
Firesheet uses your IBAN (Account Number) to link transactions to the correct account. Make sure the IBAN in your `import-settings` matches exactly what appears in your bank files.

---

::: warning Getting Lost?
If your bank's file has multiple columns for dates or amounts, choose the one that most accurately reflects the "cleared" transaction.
:::
