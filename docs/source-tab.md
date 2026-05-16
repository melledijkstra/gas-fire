# The Source Tab: Your Transaction Ledger

The `source` tab is where every single transaction lives. While the Import Wizard adds data here automatically, you have full control to refine and organize this data manually.

## Understanding the Columns

The `source` tab contains many columns, but they can be divided into two types: **System Columns** (usually filled by the importer) and **User Columns** (which you should feel free to edit).

### What You Should Edit (User Columns)

These columns are designed for you to refine your data after it has been imported:

- **Category**: The bucket this expense belongs to. While [Auto-Categorization](./categories) tries to guess this, you can always click the dropdown to change it.
- **Label**: Use this for extra organization (e.g., "Vacation 2024" or "Work Expense"). You can filter your dashboard by labels later.
- **Comments**: Any personal notes about the transaction (e.g., "Gift for Mom's birthday").
- **Disabled**: Check this box if you want to "hide" a transaction from your charts and calculations without deleting it. This is great for large one-off purchases that would otherwise ruin your monthly averages.

### What to Leave Alone (System Columns)

These columns are used by Firesheet for calculations. Changing them might break your balances:

- **Ref**: A unique ID for the transaction used to prevent duplicates.
- **IBAN**: Links the transaction to a specific bank account.
- **Date / Amount / Balance**: The core financial data from your bank.
- **Import Date**: When the transaction was added to the Firesheet.

## Pro Tips for the Source Tab

1.  **Filtering**: Use Google Sheets' built-in filter (Data > Create a filter) to quickly find all transactions for a specific category or date range.
2.  **Color Coding**: Firesheet often uses colors to highlight duplicates or specific transaction types. If a row looks different, check the [Troubleshooting](./faq) page.

> **Visual Suggestion**: [Screenshot of the `source` tab with the "Category", "Label", and "Comments" columns highlighted to show they are user-editable]
