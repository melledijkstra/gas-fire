import type { MobileCategoryMonthMetric } from './types'

export const MONTHS_IN_YEAR = 12

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function getMaxElapsedMonth(year: number, referenceDate: Date = new Date()): number {
  const currentYear = referenceDate.getFullYear()
  if (year < currentYear) {
    return MONTHS_IN_YEAR
  }
  if (year > currentYear) {
    return 0
  }
  return referenceDate.getMonth() + 1
}

export function buildCategoryMonthMetrics(
  budgets: number[],
  actuals: number[],
  maxRunningTotalMonth: number,
): MobileCategoryMonthMetric[] {
  const months: MobileCategoryMonthMetric[] = []
  let runningTotal = 0

  for (let m = 1; m <= MONTHS_IN_YEAR; m++) {
    const actual = roundCurrency(actuals[m - 1] ?? 0)
    const budget = roundCurrency(budgets[m - 1] ?? 0)
    const difference = roundCurrency(actual - budget)

    if (m <= maxRunningTotalMonth) {
      runningTotal = roundCurrency(runningTotal + difference)
    }

    months.push({
      month: m,
      actual,
      budget,
      difference,
      runningTotal,
    })
  }

  return months
}

export function adjustMonthMetricActual(
  months: MobileCategoryMonthMetric[],
  targetMonth: number,
  amountDelta: number,
  maxRunningTotalMonth: number,
): void {
  let runningTotal = 0

  for (const metric of months) {
    if (metric.month === targetMonth) {
      metric.actual = roundCurrency(metric.actual + amountDelta)
      metric.difference = roundCurrency(metric.actual - metric.budget)
    }

    if (metric.month <= maxRunningTotalMonth) {
      runningTotal = roundCurrency(runningTotal + metric.difference)
    }
    metric.runningTotal = runningTotal
  }
}
