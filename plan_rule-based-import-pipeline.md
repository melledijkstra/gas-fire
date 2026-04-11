# Feature Implementation: Rule-Based Data Processing Pipeline

I want to build a feature where the user can setup import rules which are applied to the data processing pipeline during import and dry run during the preview step.

The user can define conditions and actions for each rule. The user sets up these rules in a table in the Google Sheet. A rule consists of:

- **Rule Name**: A name explaining the rule which can be used to identify the rule in the UI. e.g. "Exclude internal transfers".
- **Bank(s)**: The name of the bank to which the rule applies or "All" (in the UI) to apply the rule to all banks. This allows users to create rules specific to certain banks.
- **Column**: The name of the column in the transaction data that the rule should be applied to. For example, "description", "amount", "category", etc. This allows users to create rules that target specific fields in the transaction data. If the rule is executed before the transformation phase, the column names will be based on the original column names in the imported file. If the rule is executed after the transformation phase, the column names will be based on the standardized column names (FIRE_COLUMNS). (Important to keep this in mind!)
- **Condition**: A logical statement that puts a condition on the rule that needs to be met for the rule to be applied. For example, "If field 'description' contains 'internal'" or "If 'fee' column is not empty".
- **Condition Value**: The value that is used in the condition. For example, if the condition is "If field 'description' contains 'internal'", the condition value would be "internal". Or empty if the condition does not require a value.
- **Action**: The operation to be performed on the transaction if the condition is met. e.g. "Exclude", "Set category", "Subtract", "Add"
- **Action Value**: The value that is used in the action. For example, if the action is "Set category", the action value would be the category to set. Or empty if the action does not require a value.
- **Stop Processing?**: A boolean flag that indicates whether to stop processing further rules if this rule is applied. This allows users to create rules that can override other rules if necessary.
- **Rule Phase**: The phase of the import process during which the rule should be applied. To keep it simple for now it can only be "PRE_TRANSFORM" or "POST_TRANSFORM".

The above are exactly the headers of the Google Sheet table where the user will input their rules.

The priority of the rules will be determined by the order in which they are created in the Google Sheet, the higher the row, the higher the priority. This means that if multiple rules apply to a transaction, the rules will be applied in order of priority. If a rule has the "Stop Processing" flag set to true, then no further rules will be applied to that transaction after that rule is applied.

If you have suggestions for additional features or actually keeping it simple, then please let me know! I want to make sure that this feature is as useful and user-friendly as possible. A simpler implementation might be easier to understand for the user.

## Technical Specification

The Google Sheet tab which contains the rules is called "import-rules". The headers of the table are as described above. Here they are again for reference: Rule Name, Bank(s), Column, Condition, Condition Value, Action, Action Value, Stop Processing?, Rule Phase.

These column names don't need to be exactly the same in the code. However the indices of the columns are important to map the rules correctly to the internal types.

The import rules will be a new phase in the import pipeline, similar to the duplicate detection phase. Consider refactoring the import pipeline to make it more modular and allow for easier integration of new phases like the rule engine (Pipeline Design Pattern). The rule engine will contain rules that need to be applied before the transformation phase (PRE_TRANSFORM) and rules that need to be applied after the transformation phase (POST_TRANSFORM).

Once the rule engine is implemented and it support to automatically categorize the transactions

### Rule Engine Implementation

The rule engine will be implemented as a separate module in the src/server/rule-engine folder. This module will be responsible for:

- Reading the rules from the Google Sheet and processing them into a format that is easy to work with.
- Filter out any rules that do not apply to the bank of the transactions being imported.
- Provide a dry run option for the preview step where the rules are applied to the transactions and any warnings or issues are collected and displayed to the user. (Removed transactions should not actually be removed during the dry run, but should be marked as excluded in the preview table with a red background and a tooltip explaining the reason for exclusion)
- Applying the rules to the transactions during the import process, and collecting any warnings or issues that arise during the processing of the rules.
- Handle a `Table` structure during the pre-transform phase and a `FireTable` structure during the post-transform phase. This means that the rule engine needs to be flexible enough to work with both types of data structures. If it makes more sense to have a `FireTransaction` type or JSON format for the post-transform phase, then that can be considered as well. The important thing is that the rule engine can work with the data structure that is being used in each phase of the import process. Consider this when setting up the implementation plan.

Example of the structure of the rule engine module:

```src/server/rule-engine
├── index.ts (main entry point for the rule engine, contains the main logic for applying rules and collecting warnings)
├── rule-parser.ts (contains logic for parsing the rules from the Google Sheet and converting them into a usable format)
├── rule-processor.ts (contains logic for processing the rules and applying them to the transactions)
├── types.ts (contains TypeScript types and interfaces for the rules and warnings)
```

Example of the structure of the rule object. The actual structure can be adjusted based on the implementation needs. Feel free to add or remove conditions and actions as you see fit. The important thing is that the structure allows for easy processing of the rules and is flexible enough to accommodate different types of conditions and actions.

```typescript
interface ImportRule {
  ruleName: string
  banks: string[] // Array of bank names or "All"
  column: string
  condition: "REGEX" | "CONTAINS" | "EQUALS" | "NOT_EMPTY" | "NOT_CONTAINS" | "GREATER_THAN" | "LESS_THAN"
  conditionValue?: string // Optional, depending on the condition
  action: "EXCLUDE" | "SET_CATEGORY" | "SUBTRACT" | "ADD"
  actionValue?: string // Optional, depending on the action
  stopProcessing: boolean
  rulePhase: "PRE_TRANSFORM" | "POST_TRANSFORM"
}
```

For the array of banks, the user can input multiple bank names separated by a comma in the Google Sheet, and then split that string into an array when processing the rules. If "All" is specified, then the rule applies to all banks.
During the import process, we can filter out any rules that do not apply to the bank currently being imported. This will improve the performance of the rule engine by only processing the relevant rules for each transaction.

The `REGEX` condition allows for more complex conditions to be defined by the user, while still keeping the interface simple. The user can input a regular expression as the condition value, and the rule engine will apply that regular expression to the specified column in order to determine if the condition is met. This is very helpful to setup automatic categorization rules based on patterns in the transaction data. For example, a user could create a rule that says "If the description column matches the regular expression `/cafe|cafeteria|cafetaría/`, then set the category to 'Eating Out'". This would automatically categorize any transactions with "Cafe", "Cafeteria" or "Cafetaría" in the description as "Eating Out".

Possible solution: Instead have "condition_column" and "action_column" instead of just "column". This way we can have rules that check a condition on one column and perform an action on another column. For example, "If 'description' contains 'internal', then set category to 'Internal Transfer'". This would make the rules more flexible and powerful. Consider this for the implementation plan.
This makes it easier to setup the "SET_CATEGORY" action which can instead be implemented as `action: "SET"` and column being "category" and the action value being the category to set. This also allows for more flexibility in the future if we want to implement actions that modify other fields besides category.

### Preview Step Integration

For the preview step, I want to implement a dry run of the import process where the rules are applied to the transactions and any warnings or issues are collected and displayed to the user. This will allow the user to see the impact of their rules before actually importing the data. For the rules that exclude (delete) transactions, the preview table should show the excluded transactions with a red background and a small Svelte Flowbite tooltip that explains the rule that caused the exclusion when the user clicks on the action column of the transaction. This will help the user understand why certain transactions are being excluded and allow them to adjust their rules if necessary.

The rule engine should keep track of any issues during the processing of the rules, and collect them for logging and proving feedback to the user. These warnings should be shown in the preview step of the import process. The warnings can be shown in a Flowbite Svelte accordion component in order not to overwhelm the user with too much information at once. The user can then expand the accordion to see the details of the warnings.

Examples of warnings include:

- Incorrect column name in the condition
- Incorrect category name in the action
- No condition indicated for the rule
- No condition value indicated for a condition that requires a value
- No action value indicated for an action that requires a value

During implementation come up with more warnings that can be useful for the user to understand potential issues with their rules.

The preview step should also visually indicate how many rules have been loaded and how many rules have been applied to the transactions. The current interface `PreviewReportSummary.svelte` already contains some information. Consider how to best integrate the rule engine information into the existing preview report summary (or come up with a new interface).

Keep in mind, when sending information from the server to the client the data is serialized and deserialized, so make sure that the data structures used for the rules and warnings are compatible with this process.

### Import Step Integration

For the actual import process, the rules should be applied to the transactions in the same way as in the preview step, but this time the changes should be actually applied to the transactions that are being imported.
Once the import is complete, the user should be provided with:

- A summary of how many transactions are imported (currently already shown).
- How many rules were applied.
- How many transactions were affected by the rules and any warnings that were generated during the import process. This can be shown in a similar way as in the preview step.

It should not close the import dialog anymore after the import is complete, but instead show the summary information and allow the user to review any warnings or issues that arose during the import process. The user can then choose to close the dialog when they are done reviewing the information.

## Implementation Plan

Analyze the current codebase, specifically the src/server/import-pipeline and src/server/table folders, and write a technical implementation plan for this feature. Include the proposed architecture, file changes, and a step-by-step tasks in order to complete the implementation.
Suggest whether to implement this feature in one go or to break it down into smaller parts and implement it iteratively. If you suggest an iterative approach, please break down the implementation into smaller features that can be implemented and tested independently.

If it makes sense, preferably go for a Test Driven Development (TDD) approach and write tests for the feature before implementing the actual logic.
