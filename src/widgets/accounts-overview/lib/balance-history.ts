import type { CashflowPoint, MonthKey } from '@/shared/api'

/**
 * Общий баланс на конец каждого месяца — «назад от сегодняшнего».
 * Знаем, сколько денег сейчас, и сколько пришло/ушло в каждом месяце.
 * Баланс на конец прошлого месяца = текущий − итог текущего месяца, и так далее.
 * Переводы между своими счетами общий баланс не меняют — их в cashflow нет.
 */
export function balanceHistory(points: CashflowPoint[], currentTotal: number): { month: MonthKey; balance: number }[] {
  const result: { month: MonthKey; balance: number }[] = []
  let balance = currentTotal
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!
    result.unshift({ month: p.month, balance })
    balance -= p.income - p.expense
  }
  return result
}
