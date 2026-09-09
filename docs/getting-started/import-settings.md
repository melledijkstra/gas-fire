# Configuring Imports

Before you can magically import all your bank transactions, you need to tell YMYL how to read the CSV files that your bank generates.

Every bank formats their CSV exports slightly differently—some call the date column "Transaction Date", others call it just "Date". Some banks put positive amounts for income, others put negative amounts. The `import-settings` tab solves this problem by creating a "map" between your bank's format and YMYL's format.

![Import Settings Tab](/import_settings.png)

## Column Mapping

Navigate to the `import-settings` tab.

If you correctly filled out your bank accounts in the `dashboard` tab, you will see your bank account names automatically populate across the top row (from Column B onwards).

Beneath each bank account, you will find a list of internal YMYL properties (under **Column Mapping**):
- `ref`
- `iban`
- `date`
- `amount`
- `balance`
- `contra_account`
- `description`
- `comments`
- ...and so on.

### How to Map Columns

1. Open a sample CSV file that you downloaded from your bank.
2. Look at the column headers (the very first row).
3. In the `import-settings` tab, type the **exact name** of your bank's CSV column next to the corresponding YMYL property.

*Example:* 
If your bank's CSV has a column named `"Transaction Amount"`, you should type `Transaction Amount` in the cell next to `amount` under that specific bank. If your bank has a column named `"Details"`, type `Details` next to `description`.

If your bank doesn't provide a specific piece of information (for example, a running balance), just leave that cell blank. The most critical columns are typically `date`, `amount`, and `description`.

## Import Automation Settings

At the very top of the `import-settings` tab, you'll notice a few toggleable configurations for each bank:

- **Auto fill columns**: A comma-separated list of columns you want to automatically fill during import (advanced feature).
- **Should autofill after import**: Toggle to `TRUE` if you want the system to run autofill scripts immediately after importing.
- **Auto categorize transactions**: Toggle to `TRUE` if you want YMYL to automatically apply your custom categorization rules to new transactions.

## Custom Import Rules

In addition to basic mapping, you can set up powerful automation in the `import-rules` tab.

This tab allows you to define "If-This-Then-That" logic for your imports. For example, if a transaction's description contains "Uber", automatically set the Category to "Transport & Car".

### How to Write a Rule

1. Navigate to the `import-rules` tab.
2. Provide a **Rule Name** (e.g. "Categorize Uber").
3. Specify the **Bank(s)** this rule applies to (or type "All").
4. Choose the **Column** to inspect (e.g. `description`).
5. Set the **Condition** (e.g. `CONTAINS` or `REGEX`).
6. Enter the **Condition Value** (e.g. `uber eats|ubereats`).
7. Select the **Action** (e.g. `SET`).
8. Select the **Action Column** (e.g. `category`).
9. Enter the **Action Value** (e.g. `Food & Groceries`).

Rules run in two phases (`PRE_TRANSFORM` before data is fully processed, and `POST_TRANSFORM` right before insertion). For simple categorization, stick to `POST_TRANSFORM`.

Once your settings and rules are dialed in, you're ready to start [Importing Transactions](./importing-transactions).
