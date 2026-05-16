# Importing Your Transactions

The **Import Wizard** is the tool that brings your bank's CSV files into the Firesheet. It's designed to be safe, so you can always see exactly what's happening before any data is permanently added.

## Step 1: Upload Your File

1.  Open the Firesheet Add-on menu in Google Sheets.
2.  Select **Import Transactions**.
3.  Choose your bank account from the dropdown list (this list comes from your [Bank Accounts](./bank-accounts) setup).
4.  Upload the CSV file you downloaded from your bank.

> **Visual Suggestion**: [Video/GIF showing the Add-on menu being opened and a file being selected]

## Step 2: The Preview

Once the file is uploaded, Firesheet will show you a **Preview Report**. This is where the magic happens!

-   **Duplicates**: Firesheet automatically detects if you've already imported a transaction and will mark it for skipping.
-   **Applied Rules**: You can see which [Automation Rules](./rules) were triggered (e.g., if a transaction was categorized).
-   **New Balance**: Firesheet calculates what your new bank balance will be after the import.

### Reviewing Transactions
You can scroll through the list and manually decide to **Skip** or **Import** any specific row.

> **Visual Suggestion**: [Screenshot of the Preview Table highlighting the "Status" column where duplicates are marked]

## Step 3: Confirmation

If everything looks correct, click **Confirm Import**. Firesheet will now:
1.  Add the new transactions to the bottom of your `source` tab.
2.  Update your bank balance.
3.  Close the wizard.

---

::: danger Stuck on Duplicates?
Firesheet uses a "digital fingerprint" to detect duplicates. If you change a transaction's amount or date in the spreadsheet later, Firesheet might not recognize it as a duplicate next time you import.
:::
