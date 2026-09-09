# Importing Your First Transactions

With your accounts set up and your CSV columns mapped, it's time for the fun part: importing your transactions into the spreadsheet.

YMYL features a custom-built interface that sits right inside your Google Sheet, making it incredibly easy to upload, preview, and process your bank data without copy-pasting.

## The Import Wizard

To launch the importer:

1. Look at the top menu bar of your Google Sheet.
2. Click on the custom **YMYL** menu.
3. Click **Upload Transactions (CSV)**.

*(A dialog window will pop up in the center of your screen.)*

### Step 1: Select Your Bank
The wizard will ask you to select which bank account you are importing data for. Select the appropriate bank from the dropdown list. The IBAN associated with this bank will be automatically populated.

### Step 2: Upload Your CSV
Drag and drop your bank's CSV export file into the upload zone, or click to browse your computer for the file. 

### Step 3: Processing & Preview
Once you upload the file, YMYL goes to work:
- It maps the CSV columns according to the settings you defined in the `import-settings` tab.
- It scans the `source` tab to detect if you've already imported any of these transactions (Duplicate Detection).
- It runs your custom rules from the `import-rules` tab to auto-categorize and transform the data.

### Step 4: Review the Preview Report
Before any data is permanently added to your spreadsheet, you will be presented with an **Import Preview Report**.

Take a moment to review this carefully! The preview will highlight:
- How many total transactions were found.
- How many new, valid transactions are ready to be imported.
- How many duplicates were caught and skipped.
- The categories that were automatically assigned.

### Step 5: Insert Data
If everything looks correct in the preview, confirm the import. The wizard will securely write the new rows directly into your `source` tab.

## After Importing

> [!TIP]
> Always check your balances! After a successful import, go to the `dashboard` tab and compare the calculated balance for your bank account against your actual, real-world bank balance. If they match, you're perfectly in sync!

All of your newly imported transactions are now living in the `source` tab. You can navigate there to manually categorize any transactions that the rules missed, or leave comments on specific purchases.
