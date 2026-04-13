import { detectCategoryByTextAnalysis } from './detection'
import { FireTable } from '@/common/table/FireTable'

/**
 * Auto-categorizes transactions that don't have a category set.
 * Uses text analysis on the `contra_account` column to detect categories.
 *
 * @returns An object with category update values (one per row) and a count of categorized rows.
 */
export function categorizeFireTable(fireTable: FireTable): {
  categoryUpdates: string[][]
  rowsCategorized: number
} {
  const categoryColIndex = FireTable.getFireColumnIndex('category')
  const contraAccountIndex = FireTable.getFireColumnIndex('contra_account')

  let rowsCategorized = 0
  const categoryUpdates: string[][] = []

  for (const row of fireTable.data) {
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
