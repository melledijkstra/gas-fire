import { detectCategoryByTextAnalysis } from './detection'
import { YMYLTable } from '@/common/table/YMYLTable'

/**
 * Auto-categorizes transactions that don't have a category set.
 * Uses text analysis on the `contra_account` column to detect categories.
 *
 * @returns An object with category update values (one per row) and a count of categorized rows.
 */
export function categorizeYMYLTable(ymylTable: YMYLTable): {
  categoryUpdates: string[][]
  rowsCategorized: number
} {
  const categoryColIndex = YMYLTable.getYMYLColumnIndex('category')
  const contraAccountIndex = YMYLTable.getYMYLColumnIndex('contra_account')

  let rowsCategorized = 0
  const categoryUpdates: string[][] = []

  for (const row of ymylTable.data) {
    const category = String(row[categoryColIndex] ?? '')
    const contraAccount = String(row[contraAccountIndex] ?? '')

    let newCategory = category

    if (!category || category === '') {
      const detectedCategory = detectCategoryByTextAnalysis(contraAccount)
      if (detectedCategory) {
        newCategory = detectedCategory
        rowsCategorized++
      }
    }

    categoryUpdates.push([newCategory])
  }

  return { categoryUpdates, rowsCategorized }
}

/** @deprecated Use categorizeYMYLTable */
export const categorizeFireTable = categorizeYMYLTable
