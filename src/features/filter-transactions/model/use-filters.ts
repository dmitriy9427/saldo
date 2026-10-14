/**
 * Фильтры списка операций живут в АДРЕСЕ страницы:
 *   /transactions?period=month&month=2026-09&type=expense&category=cafe&page=2
 *
 * Почему не в Redux и не в useState:
 *   - ссылкой можно поделиться, после перезагрузки фильтр на месте;
 *   - «Назад» в браузере возвращает прошлый фильтр;
 *   - с главной можно прислать готовый фильтр: клик по категории в диаграмме
 *     ведёт на /transactions?category=cafe&month=2026-09.
 * Адрес — единственный источник правды; из него вычисляется запрос к API.
 */
import { useSearchParams } from 'react-router'

import type { ID, MonthKey, SortDir, SortField, TransactionQuery, TransactionType } from '@/shared/api'
import { currentMonth, monthRange, shiftMonth, today } from '@/shared/lib'
import { PAGE_SIZE } from '@/shared/config'

export type Period = 'month' | '3m' | 'year' | 'all'

export interface Filters {
  period: Period
  month: MonthKey
  type?: TransactionType
  accountId?: ID
  categoryId?: ID
  q: string
  sort: SortField
  dir: SortDir
  page: number
}

const PERIODS: Period[] = ['month', '3m', 'year', 'all']
const TYPES: TransactionType[] = ['expense', 'income', 'transfer']

/** Адрес → фильтры. Мусор в адресе (?page=abc) не ломает страницу — берём значение по умолчанию. */
export function parseFilters(params: URLSearchParams): Filters {
  const period = params.get('period') as Period
  const type = params.get('type') as TransactionType
  const month = params.get('month') ?? ''
  const page = Number(params.get('page'))
  return {
    period: PERIODS.includes(period) ? period : 'month',
    month: /^\d{4}-\d{2}$/.test(month) ? month : currentMonth(),
    type: TYPES.includes(type) ? type : undefined,
    accountId: params.get('account') || undefined,
    categoryId: params.get('category') || undefined,
    q: params.get('q') ?? '',
    sort: params.get('sort') === 'amount' ? 'amount' : 'date',
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** Фильтры → запрос к API. */
export function toQuery(f: Filters): TransactionQuery {
  const range =
    f.period === 'month'
      ? monthRange(f.month)
      : f.period === '3m'
        ? { from: monthRange(shiftMonth(f.month, -2)).from, to: today() }
        : f.period === 'year'
          ? { from: monthRange(shiftMonth(currentMonth(), -11)).from, to: today() }
          : {}
  return {
    ...range,
    type: f.type,
    accountId: f.accountId,
    categoryId: f.categoryId,
    q: f.q.trim() || undefined,
    sort: f.sort,
    dir: f.dir,
    page: f.page,
    pageSize: PAGE_SIZE,
  }
}

const PARAM: Record<keyof Filters, string> = {
  period: 'period',
  month: 'month',
  type: 'type',
  accountId: 'account',
  categoryId: 'category',
  q: 'q',
  sort: 'sort',
  dir: 'dir',
  page: 'page',
}

/** Значения по умолчанию в адрес не пишем — адрес короче и «чистая» страница = /transactions. */
const DEFAULTS: Partial<Record<keyof Filters, string>> = {
  period: 'month',
  month: currentMonth(),
  sort: 'date',
  dir: 'desc',
  page: '1',
  q: '',
}

export function useTransactionFilters() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)

  /** Поменять фильтры. Любой фильтр, кроме страницы, сбрасывает страницу на первую. */
  function set(patch: Partial<Filters>, { replace = false } = {}) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch) as [keyof Filters, unknown][]) {
          const text = value === undefined || value === null ? '' : String(value)
          if (!text || text === DEFAULTS[key]) next.delete(PARAM[key])
          else next.set(PARAM[key], text)
        }
        if (!('page' in patch)) next.delete('page')
        return next
      },
      // replace — для поиска «по мере ввода»: каждая буква не должна становиться шагом истории.
      { replace },
    )
  }

  const active = Boolean(filters.type || filters.accountId || filters.categoryId || filters.q || filters.period !== 'month')

  return { filters, query: toQuery(filters), set, reset: () => setParams({}), active }
}
