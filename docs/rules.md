# Custom Automation Rules

For more advanced users, the `import-rules` tab allows you to create "If This, Then That" logic to clean up your data automatically.

## Why use Rules?

Sometimes bank data is messy. You might want to:
- **Skip** internal transfers between your own accounts.
- **Fix** weird descriptions (e.g., change "ZTL*Uber" to just "Uber").
- **Adjust** amounts (e.g., subtract fees that the bank hides in another column).

## How a Rule is Structured

Every rule in the `import-rules` tab follows this pattern:

1.  **Bank(s)**: Which bank account should this rule apply to? (e.g., "Revolut" or "All").
2.  **Column**: Which column should we check? (e.g., "description").
3.  **Condition**: How should we check it?
    -   `EQUALS`: Exactly the same text.
    -   `CONTAINS`: The text appears anywhere inside.
    -   `REGEX`: For advanced pattern matching (like email addresses or IDs).
4.  **Action**: What should we do if the condition is met?
    -   `EXCLUDE`: Don't import this transaction at all.
    -   `SET`: Change the value of a column to something else.
    -   `SUBTRACT_COLUMN`: Subtract the value of one column from another.

> **Visual Suggestion**: [Screenshot showing a rule that excludes transactions containing "Internal Transfer"]

## Example: The "Supermarket" Rule

If you want all supermarkets to be categorized as "Food & Groceries", you could create a rule:
- **Bank**: All
- **Column**: contra_account
- **Condition**: CONTAINS
- **Value**: Tesco
- **Action**: SET
- **Action Column**: category
- **Action Value**: Food & Groceries

---

::: warning Power User Tip
Rules are processed from top to bottom. If multiple rules apply, the ones at the top happen first!
:::
