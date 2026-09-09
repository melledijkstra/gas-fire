# Dashboard Reference

The `dashboard` tab serves as your executive command center. It is critical for getting a high-level view of your financial health.

![Dashboard Tab](/dashboard.png)

## Bank Accounts

The top-left section is dedicated to your bank accounts (Fiat / Liquid Assets).

- **Accounts**: The custom name you gave your bank account. This name cascades to other tabs (like `import-settings`).
- **IBAN/Account Number**: The account number associated with the bank.
- **Balance**: Your current liquid balance in the account. This number is automatically summed from all imported transactions in the `source` tab.
- **Transactions**: The total count of transactions for this account.
- **Last transaction**: The date of the most recent imported transaction.
- **Link to Bank**: A convenient shortcut you can add to navigate directly to your bank's website to download CSVs.

## Net Worth Breakdown

On the right side of the dashboard, you will find the aggregation of all your long-term tracking tabs.

- **Fiat / Liquid Assets**: The total balance of all your checking and savings accounts (summed from the left side of the dashboard).
- **Capital**: The total value of your illiquid assets (from the `capital` tab).
- **Investments**: The current value of your investments (from the `investments` tab).
- **Debt**: The total remaining balance of your liabilities (from the `debt` tab).

**Net Worth** is calculated dynamically using the formula:
`(Liquid Assets) + Capital + Investments - Debt`

## Additional Metrics

Below the Net Worth calculation, the dashboard provides further insights:

- **Not categorized**: Shows the percentage and total amount of transactions in your `source` tab that lack a designated category. This helps you keep your ledger tidy!
- **Average monthly expenses**: Calculated based on your historical spending.
- **Emergency fund**: Shows the amount you need to cover a designated number of months of living expenses (usually 5-6 months), based on your average monthly expenses.
- **Emergency Fund Covered?**: A simple "Yes/No" indicator telling you if your current Liquid Assets exceed your required Emergency Fund.
- **Over balance able to invest**: The amount of liquid cash you hold _above_ your required emergency fund, which theoretically could be invested.
