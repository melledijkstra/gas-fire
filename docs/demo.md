# Demo: A Complete Import Flow

In this demo, we will walk through the entire process of setting up a bank account and importing your first set of transactions.

## 1. The Setup (One-Time)

Imagine you have a bank called **"Horizon Bank"**. You download a CSV file from their website that looks like this:

### Example CSV Data (`horizon_export.csv`)

| Transaction Date | Payee | Memo | Value | Balance |
| --- | --- | --- | --- | --- |
| 01/05/2024 | Super-Mart | Weekly Groceries | -54.20 | 1200.00 |
| 02/05/2024 | Landlord Inc | May Rent | -800.00 | 400.00 |
| 03/05/2024 | Tech Corp | Monthly Salary | 2500.00 | 2900.00 |

### Mapping the Columns
In the `import-settings` tab, you would create a new column for **Horizon Bank** and map it like this:

- **date** → `Transaction Date`
- **amount** → `Value`
- **contra_account** → `Payee`
- **description** → `Memo`

> **Visual Suggestion**: [Image showing the comparison between the CSV headers and the `import-settings` mapping row]

## 2. The Import Process

Now that Horizon Bank is set up, you open the **Import Wizard** Add-on.

1.  **Select Bank**: You choose "Horizon Bank" from the dropdown.
2.  **Upload**: You select your `horizon_export.csv` file.

### The Automation Magic
Because you have a [Category Keyword](./categories) for `Super-Mart` set to "Food", and an [Automation Rule](./rules) that recognizes `Tech Corp` as "Salary", the Preview Wizard shows:

| Status | Date | Payee | Amount | Category |
| --- | --- | --- | --- | --- |
| **NEW** | 01/05 | Super-Mart | -54.20 | **Food** |
| **NEW** | 02/05 | Landlord Inc | -800.00 | *Uncategorized* |
| **NEW** | 03/05 | Tech Corp | 2500.00 | **Salary** |

> **Visual Suggestion**: [GIF of the Preview screen showing the categories automatically populating for Super-Mart and Tech Corp]

## 3. The Result

After clicking **Confirm**, the transactions are added to your `source` tab. Your **Dashboard** now updates automatically:
- Your **Net Worth** increases by your Salary.
- Your **Monthly Spending** chart shows the -54.20 in the "Food" slice.

> **Visual Suggestion**: [Image showing the "Before" and "After" of the Dashboard Net Worth widget]
