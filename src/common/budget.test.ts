import {
  adjustMonthMetricActual,
  buildCategoryMonthMetrics,
  getMaxElapsedMonth,
  recalculateCategoryBudgetMonths,
  roundCurrency,
} from './budget'

describe('shared budget helpers', () => {
  test('roundCurrency rounds to 2 decimals accurately', () => {
    expect(roundCurrency(10.555)).toBe(10.56)
    expect(roundCurrency(-220.6900001)).toBe(-220.69)
  })

  test('getMaxElapsedMonth returns 12 for past years, 0 for future years, and current month for current year', () => {
    const refDate = new Date(2026, 4, 15) // May 2026 (month 5)
    expect(getMaxElapsedMonth(2025, refDate)).toBe(12)
    expect(getMaxElapsedMonth(2026, refDate)).toBe(5)
    expect(getMaxElapsedMonth(2027, refDate)).toBe(0)
  })

  test('buildCategoryMonthMetrics and adjustMonthMetricActual compute difference and runningTotal', () => {
    const budgets = [-200, -200, -200, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const actuals = [-180, -250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    const months = buildCategoryMonthMetrics(budgets, actuals, 2)
    expect(months[0]).toEqual({
      month: 1,
      actual: -180,
      budget: -200,
      difference: 20,
      runningTotal: 20,
    })
    expect(months[1]).toEqual({
      month: 2,
      actual: -250,
      budget: -200,
      difference: -50,
      runningTotal: -30,
    })
    expect(months[2].runningTotal).toBe(-30)

    adjustMonthMetricActual(months, 1, -20, 2)
    expect(months[0].actual).toBe(-200)
    expect(months[0].difference).toBe(0)
    expect(months[0].runningTotal).toBe(0)
    expect(months[1].runningTotal).toBe(-50)
  })

  test('recalculateCategoryBudgetMonths updates budgets, differences, and YTD running totals', () => {
    const budgets = [-200, -200, -200, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const actuals = [-180, -250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const months = buildCategoryMonthMetrics(budgets, actuals, 2)

    // Increase Feb budget allowance by -50 (from -200 to -250) and Mar by +50 (from -200 to -150)
    recalculateCategoryBudgetMonths(months, { 2: -50, 3: 50 }, 2)

    expect(months[0].runningTotal).toBe(20)
    expect(months[1].budget).toBe(-250)
    expect(months[1].difference).toBe(0)
    expect(months[1].runningTotal).toBe(20)
    expect(months[2].budget).toBe(-150)
    expect(months[2].difference).toBe(150)
    // Month 3 is beyond maxRunningTotalMonth (2), so runningTotal stays at month 2's total
    expect(months[2].runningTotal).toBe(20)
  })
})
