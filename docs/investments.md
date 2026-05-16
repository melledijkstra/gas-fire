# Tracking Investments

Firesheet isn't just for daily spending; it's designed to track your path to financial independence. The `investments` tab helps you track the value of your assets over time.

## Setting Up Your Assets

Each row in the `investments` tab represents a specific asset. This could be:
- A brokerage account (e.g., Vanguard, Degiro).
- Individual stocks or ETFs.
- Cryptocurrency wallets.
- Your home equity or pension fund.

### Core Columns to Fill

1.  **Asset Name**: A clear name for the investment.
2.  **Type**: Categorize it (e.g., "Stocks", "Real Estate", "Cash").
3.  **Current Value**: The total value today. You can update this manually once a month or use Google Sheets formulas (like `=GOOGLEFINANCE`) to track stock prices automatically.
4.  **Currency**: If the asset is in a foreign currency, Firesheet will use the exchange rate to convert it to your main currency for the Dashboard.

## How it Connects

The total value from the `investments` tab is pulled directly into your **Net Worth** on the [Dashboard](./dashboard). This allows you to see your total wealth grow as you invest more and as your assets increase in value.

## Investment Transactions

If you want to track the *performance* (how much profit you made), you can also use the `inv-transactions` tab. 
- When you buy more of an asset, record it here.
- When you receive dividends, record them here.

Firesheet uses these transactions to calculate your **Total Return** and your **Savings Rate**.

---

::: tip Automated Stock Prices
You can use `=GOOGLEFINANCE("TICKER")` in the value column to have Google Sheets automatically update your stock and ETF values every day!
:::
