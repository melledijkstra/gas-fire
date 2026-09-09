# Initial Setup

Once you've had a chance to explore the dummy data, it's time to set up the spreadsheet for your own personal use.

## 💱 Setting Your Currency

The spreadsheet template uses **EURO (€)** as the default currency. If you wish to use a different currency (e.g. £ or $), you can update the Google Sheets location settings:

1. In the Google Sheets menu, click on **File > Settings**.
2. Under the **General** tab, change the **Locale** to your country.
3. Click **Save and reload**.

If you need to change the formatting for specific cells (for example, you want a specific column to display £ instead of €), you can select the cells and go to **Format > Number > Custom currency**.

## 🏦 Adding Your Bank Accounts

Your next step is to configure your bank accounts on the **dashboard** tab.

1. Navigate to the `dashboard` tab.
2. In the **Accounts** section (top left), you'll see a list of dummy banks (e.g. *Commonwealth Bank*, *Barklays*).
3. Replace the dummy names in **Column A** with the actual names of your bank accounts (e.g., "Chase Checking", "Amex Credit Card").
4. Replace the dummy IBANs/Account Numbers in **Column B** with your real account numbers.

> [!IMPORTANT]
> The names of the bank accounts you enter here are critical. They will automatically populate across the rest of the spreadsheet (such as in the `import-settings` tab). 

The balances and transaction counts (Columns C through F) will automatically update as you import your transactions in the upcoming steps.

When you've added all your accounts, let's move on to mapping your CSV exports in [Configuring Imports](./import-settings).
