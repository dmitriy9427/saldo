/**
 * Даты. Храним строками 'YYYY-MM-DD' (ISODate) — без времени и часового пояса.
 *
 * Почему не Date: `new Date('2026-10-01')` — это полночь по UTC, а в Москве
 * (UTC+3) уже 03:00, а в Нью-Йорке ещё 30 сентября. Для операции «купил хлеб
 * 1 октября» время не нужно, а сдвиг на день — баг. Строку сравнивают как строку:
 * '2026-09-30' < '2026-10-01' — лексикографически, без парсинга.
 */
import { addMonths, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

import type { ISODate, MonthKey } from '../api/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Локальная дата (не UTC!) → 'YYYY-MM-DD'. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const today = (): ISODate => toISODate(new Date())

export function yesterday(): ISODate {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

export const monthOf = (date: ISODate): MonthKey => date.slice(0, 7)

export const currentMonth = (): MonthKey => monthOf(today())

/** '2026-10' → { from: '2026-10-01', to: '2026-10-31' }. */
export function monthRange(month: MonthKey): { from: ISODate; to: ISODate } {
  const start = parseISO(`${month}-01`)
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return { from: `${month}-01`, to: toISODate(last) }
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return format(addMonths(parseISO(`${month}-01`), delta), 'yyyy-MM')
}

/** Последние n месяцев, включая текущий, по возрастанию. */
export function lastMonths(n: number, end: MonthKey = currentMonth()): MonthKey[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(end, i - n + 1))
}

/** '2026-10' → «Октябрь 2026», short → «окт». */
export function formatMonth(month: MonthKey, variant: 'long' | 'short' | 'genitive' | 'dative' = 'long'): string {
  const date = parseISO(`${month}-01`)
  if (variant === 'short') return format(date, 'LLL', { locale: ru }).replace('.', '')
  // MMMM — родительный падеж («14 сентября»), LLLL — именительный («сентябрь»).
  if (variant === 'genitive') return format(date, 'MMMM', { locale: ru })
  if (variant === 'dative') {
    // «к сентябрю», «к маю», «к марту»: date-fns дательного падежа не знает.
    const name = format(date, 'LLLL', { locale: ru })
    return /[ьй]$/.test(name) ? `${name.slice(0, -1)}ю` : `${name}у`
  }
  const text = format(date, 'LLLL yyyy', { locale: ru })
  return text[0]!.toUpperCase() + text.slice(1)
}

/** '2026-10-14' → «14 октября», с годом — если не текущий. */
export function formatDay(date: ISODate): string {
  const d = parseISO(date)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return format(d, sameYear ? 'd MMMM' : 'd MMMM yyyy', { locale: ru })
}

/** Подпись группы в списке: «Сегодня», «Вчера», «12 октября, понедельник». */
export function formatDayHeading(date: ISODate): string {
  const t = today()
  if (date === t) return 'Сегодня'
  if (date === yesterday()) return 'Вчера'
  return format(parseISO(date), 'd MMMM, EEEE', { locale: ru })
}
