# Bug Analysis and Fixes

## Bug 1: Incorrect Date Sorting Logic in `sortByDate` Function

### Location
`src/server/table-utils.ts` lines 111-112

### Issue
The `sortByDate` function uses `getUTCDate()` which returns the day of the month (1-31), not the full date timestamp. This causes incorrect sorting because it only compares the day component, ignoring year and month.

```typescript
new Date(row1[dateColumn]).getUTCDate() - new Date(row2[dateColumn]).getUTCDate()
```

### Impact
- Rows with the same day of month but different months/years will be considered equal
- Data will not be sorted chronologically, leading to incorrect order in financial records
- This is a critical bug for financial data where chronological order is essential

### Fix
Replace `getUTCDate()` with `getTime()` to compare full timestamps:

```typescript
new Date(row1[dateColumn]).getTime() - new Date(row2[dateColumn]).getTime()
```

## Bug 2: Duplicate Detection Logic Error in `findDuplicates` Function

### Location
`src/server/duplicate-finder.ts` lines 48-62

### Issue
The duplicate detection algorithm has a logical flaw where it adds both the current row and the comparison row to the duplicates array, but only tracks the current row in the `seen` set. This can lead to:
1. The same comparison row being added multiple times
2. Incorrect duplicate detection results

### Impact
- Duplicate rows may appear multiple times in the result
- Performance degradation due to redundant entries
- Inaccurate duplicate detection results

### Fix
Track both rows in the seen set and ensure each unique row is only added once to the duplicates array.

## Bug 3: Unsafe Type Conversion in `AccountUtils.getBalance`

### Location
`src/server/account-utils.ts` line 78

### Issue
The function uses `parseFloat()` directly on `account[2]` without proper error handling. While there's an `isNumeric` check, `parseFloat()` can still return `NaN` for edge cases, and the function doesn't handle potential runtime errors.

### Impact
- Runtime errors if the balance value is malformed
- `NaN` values being returned instead of proper error handling
- Potential crashes in financial calculations

### Fix
Add proper error handling and validation before parsing the float value.

## Summary of Fixes Applied

### 1. Fixed Date Sorting Logic
**File**: `src/server/table-utils.ts`
**Change**: Replaced `getUTCDate()` with `getTime()` in the `sortByDate` function to properly compare full timestamps instead of just day of month.

### 2. Fixed Duplicate Detection Algorithm
**File**: `src/server/duplicate-finder.ts`
**Change**: Modified the duplicate detection logic to properly track both rows in the `seen` set and ensure each unique row is only added once to the duplicates array.

### 3. Enhanced Balance Parsing Error Handling
**File**: `src/server/account-utils.ts`
**Change**: Added proper NaN validation after `parseFloat()` to throw a descriptive error if the balance value is invalid.

## Test Results
All existing tests continue to pass after the fixes:
- ✅ `duplicate-finder.test.ts` - 6 tests passed
- ✅ `account-utils.test.ts` - 3 tests passed  
- ✅ `transformers.test.ts` - 1 test passed

## Impact Assessment
These fixes address critical issues in a financial application:
1. **Data Integrity**: Proper chronological sorting ensures financial records are in correct order
2. **Accuracy**: Duplicate detection now works correctly to prevent double-counting transactions
3. **Reliability**: Enhanced error handling prevents crashes from malformed balance data

All fixes maintain backward compatibility and don't break existing functionality.