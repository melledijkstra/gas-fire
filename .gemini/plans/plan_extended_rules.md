# Extended Rule Engine Conditions and Actions Implementation Plan

## Objective

Enhance the existing rule engine by implementing a comprehensive set of new conditions and actions to support more complex data processing and categorization requirements during the import pipeline.

## Context

- **Architecture**: The rule engine operates in two phases (`PRE_TRANSFORM`, `POST_TRANSFORM`). Rules are parsed from a Google Sheet config (`src/server/rule-engine/rule-parser.ts`) and applied to rows (`src/server/rule-engine/rule-processor.ts`).
- **Data Types**: In `rule-processor.ts`, cell values are strings. When performing math operations (e.g., `MULTIPLY`, `BETWEEN`), the cell value must be parsed into a number (`Number.parseFloat(value)`). Ensure `Number.isNaN()` checks are used to prevent `NaN` values from propagating.
- **Dates**: The system handles dates based on locale settings. When implementing `BEFORE_DATE`/`AFTER_DATE`, `IS_WEEKEND`, etc., use the existing `parseDate` utility from `src/server/parsers/date.ts` to convert the string cell value into a valid Date object before comparison.
- **Missing implementation detail**: `applyAction` currently does not have access to the `accountId` or `Config` to determine the locale for date parsing, so Date based rules might need an architectural update to pass the `Config` down to `evaluateCondition` if localized parsing is required for the *condition* (it is required for the cell value).

## Key Files & Context

- `src/server/rule-engine/types.ts`: Type definitions for `RuleCondition` and `RuleAction`.
- `src/server/rule-engine/rule-parser.ts`: Validation and parsing logic for incoming rules from the spreadsheet.
- `src/server/rule-engine/rule-parser.test.ts`: Unit tests for rule validation.
- `src/server/rule-engine/rule-processor.ts`: Core execution logic for evaluating conditions and applying actions.
- `src/server/rule-engine/rule-processor.test.ts`: Unit tests for rule execution.
- `src/server/parsers/date.ts`: Date parsing utilities required for date-based conditions.

## Implementation Steps

### 1. Update Type Definitions (`types.ts`)

- Add new `RuleCondition` types: `BETWEEN`, `IS_POSITIVE`, `IS_NEGATIVE`, `IN_LIST`, `BEFORE_DATE`, `AFTER_DATE`, `IS_WEEKEND`, `MATCH_MONTH`, `MATCH_DAY_OF_WEEK`.
- Add new `RuleAction` types: `MULTIPLY`, `DIVIDE`, `MULTIPLY_COLUMN`, `DIVIDE_COLUMN`, `PREPEND`, `APPEND`, `REPLACE`.

### 2. Implement Validation Logic (`rule-parser.ts`)

- Update `VALID_CONDITIONS` and `VALID_ACTIONS` sets with the new types.
- Add specific condition value validation:
  - **No Condition Value required**: `IS_POSITIVE`, `IS_NEGATIVE`, `IS_WEEKEND`.
  - **Required Format**:
    - `BETWEEN`: Must contain a hyphen `-` and parse into two numbers (e.g., `100-500`).
    - `BEFORE_DATE` / `AFTER_DATE`: Must be a parseable date string (e.g., `YYYY-MM-DD`).
    - `MATCH_MONTH`: Must be a number between 1 and 12.
    - `MATCH_DAY_OF_WEEK`: Must be a number between 1 and 7.
- Add specific action value validation:
  - **Math Actions** (`MULTIPLY`, `DIVIDE`, `MULTIPLY_COLUMN`, `DIVIDE_COLUMN`): Require both `Action Column` and `Action Value`.
  - **String Actions** (`PREPEND`, `APPEND`, `REPLACE`): Require both `Action Column` and `Action Value`.
  - **REPLACE Specific**: The `Action Value` must contain a pipe `|` character (e.g., `Old|New`).

### 3. Implement Execution Logic (`rule-processor.ts`)

#### 3.1. `evaluateCondition` Updates

- **`BETWEEN`**: Split `conditionValue` by `-`. Parse bounds. Check if `numVal` is >= lower and <= upper.
- **`IS_POSITIVE` / `IS_NEGATIVE`**: Parse `value` as number. Check if > 0 or < 0.
- **`IN_LIST`**: Split `conditionValue` by `,`. Trim items. Check if lowercase `value` is in the list.
- **`BEFORE_DATE` / `AFTER_DATE`**: Parse `value` using `parseDate` from `src/server/parsers/date.ts`. Parse `conditionValue` as a Date object. Compare timestamps.
- **`IS_WEEKEND`**: Parse `value` using `parseDate`. Check if `getDay()` is 0 (Sunday) or 6 (Saturday).
- **`MATCH_MONTH`**: Parse `value` using `parseDate`. Check if `getMonth() + 1` matches `conditionValue`.
- **`MATCH_DAY_OF_WEEK`**: Parse `value` using `parseDate`. Note: JS `getDay()` is 0-6 (Sun-Sat). Map user input 1-7 (Mon-Sun) to match.

#### 3.2. `applyAction` Updates

- **`MULTIPLY` / `DIVIDE`**: Parse cell value and `actionValue` as numbers. Perform operation. Handle divide by zero gracefully (e.g., warn and skip).
- **`MULTIPLY_COLUMN` / `DIVIDE_COLUMN`**: Similar to `SUBTRACT_COLUMN`. Find `actionValue` column index, retrieve value, parse both as numbers, and perform operation. Handle divide by zero.
- **`PREPEND`**: `row[targetColumnIndex] = (rule.actionValue ?? '') + currentValue`
- **`APPEND`**: `row[targetColumnIndex] = currentValue + (rule.actionValue ?? '')`
- **`REPLACE`**: Split `rule.actionValue` by `|`. Perform a global string replace: `currentValue.split(searchStr).join(replaceStr)`.

### 4. Verification & Testing

#### 4.1. Parser Tests (`rule-parser.test.ts`)

- Add tests verifying the updated required/optional condition values (e.g., `IS_POSITIVE` should not fail if `conditionValue` is empty).
- Add tests verifying specific formatting requirements (e.g., `BETWEEN` missing `-`, `REPLACE` missing `|`).
- Ensure all new actions correctly require `Action Column` and `Action Value`.

#### 4.2. Processor Tests (`rule-processor.test.ts`)

- Add a dedicated `describe` block for new conditions. Test boundary cases for `BETWEEN`, date parsing logic for `BEFORE_DATE`/`AFTER_DATE`, and edge cases for `IN_LIST`.
- Add a dedicated `describe` block for new actions. Test math operations (including divide by zero), string manipulations, and correct column targeting for `MULTIPLY_COLUMN`/`DIVIDE_COLUMN`.
