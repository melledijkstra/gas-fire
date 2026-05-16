# Frequently Asked Questions (FAQ)

## General Questions

### Does Firesheet support my bank?
Firesheet supports any bank that can export transactions as a **CSV file**. As long as you can download a spreadsheet-like file from your bank's website, you can configure Firesheet to read it in the [Bank Accounts](./bank-accounts) tab.

### Is my data safe?
Yes. Your data stays in **your** Google Drive and **your** Google Sheet. The Add-on runs directly in your browser and on your Google account. No third party (including the creators of Firesheet) has access to your financial data.

## Troubleshooting

### Why are my transactions not being categorized?
1.  Check if **Auto categorize** is set to `TRUE` for that bank in the `import-settings` tab.
2.  Make sure you have [Keywords](./categories) set up for your categories.
3.  Check if an [Automation Rule](./rules) is excluding or overriding the category.

### I see a "Duplicate" warning, but it's a new transaction.
Firesheet detects duplicates by looking at the Date, Amount, and Description. If you have two *identical* transactions on the same day (e.g., two coffees for £3.50 at the same shop), Firesheet might think the second one is a duplicate. You can manually change the status to "Import" in the Preview Wizard if this happens.

### How do I reset everything?
If you want to start over, you can clear the `source` tab. However, be careful! Once you delete transactions from the `source` tab, they are gone unless you have a backup.

---

::: tip Still have questions?
Feel free to open an issue on our [GitHub page](https://github.com/melledijkstra/gas-fire/issues) if you find a bug or have a feature request!
:::
