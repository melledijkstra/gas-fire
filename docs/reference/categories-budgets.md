# Categories & Budgets Reference

Budgeting and categorization are the core engines of the YMYL template. Understanding how categories link to your yearly budgets is essential for gaining insights into your spending habits.

## Categories

The `categories` tab defines the exact "buckets" that transactions in your `source` tab can be sorted into.

### Important Limitations
> [!WARNING]
> **Do Not Rename the Tab**
> The `categories` tab must keep its exact name. The background code relies on this name to function properly.

> [!WARNING]
> **Adding New Categories**
> Currently, the system is hard-coded to support the specific amount of categories provided in the template. You cannot simply insert a new row to create an entirely new category, as the formulas in the Budget tabs won't automatically pick it up. 
> 
> *Workaround:* If you need a different category, simply rename an existing one that you don't use! 

### Columns
- **Icon**: An emoji that visually represents the category (this appears in the `source` tab).
- **Name**: The category name (e.g., "Food & Groceries", "Salary"). You can change these to suit your lifestyle.
- **Description**: A guideline on what belongs in this category. (e.g., *Income that is separate from salary (e.g. tax returns, side gigs).*).
- **Amount Transactions**: Automatically counts how many times this category has been used in your `source` tab.

## Yearly Budgets (e.g., 2026, 2027)

Yearly budgets are found in separate tabs named after the respective year (e.g. "2026"). 

These tabs display a powerful matrix:
- **Rows**: Your categories (pulled directly from the `categories` tab).
- **Columns**: The 12 months of the year (Jan - Dec).

### How to use it
For each month, enter your expected financial flow for that category.
- **Income Categories** (like Salary): Enter positive numbers (e.g. `2000`).
- **Expense Categories** (like Food & Groceries): Enter negative numbers (e.g. `-200`).

As you import your real transactions, the dashboard and other reporting features will use this matrix to compare your *Actual Spending* against your *Budgeted Spending*, letting you know if you are staying on track with your Financial Independence goals!
