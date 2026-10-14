import type { ISODate, Transaction } from '@/shared/api'

export interface DayGroup {
  date: ISODate
  items: Transaction[]
  /** Сколько за день ушло и пришло (переводы не считаются). */
  net: number
}

/**
 * Операции → группы по дням с итогом дня. Ожидает отсортированный по дате
 * список (как отдаёт сервер) и не меняет порядок.
 */
export function groupByDay(items: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const t of items) {
    let group = groups.at(-1)
    if (group?.date !== t.date) {
      group = { date: t.date, items: [], net: 0 }
      groups.push(group)
    }
    group.items.push(t)
    if (t.type === 'income') group.net += t.amount
    if (t.type === 'expense') group.net -= t.amount
  }
  return groups
}

/** Сумма со знаком для показа: расход −, доход +, перевод — без знака. */
export const signedAmount = (t: Pick<Transaction, 'type' | 'amount'>) =>
  t.type === 'expense' ? -t.amount : t.amount

export const TYPE_LABEL: Record<Transaction['type'], string> = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
}
