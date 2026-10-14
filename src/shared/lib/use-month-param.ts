import { useSearchParams } from 'react-router'

import type { MonthKey } from '../api/types'
import { currentMonth } from './date'

/** Выбранный месяц в адресе (?month=2026-09). Текущий месяц в адрес не пишется. */
export function useMonthParam(): [MonthKey, (month: MonthKey) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('month') ?? ''
  const month = /^\d{4}-\d{2}$/.test(raw) && raw <= currentMonth() ? raw : currentMonth()
  const setMonth = (next: MonthKey) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === currentMonth()) p.delete('month')
        else p.set('month', next)
        return p
      },
      { replace: true },
    )
  return [month, setMonth]
}
