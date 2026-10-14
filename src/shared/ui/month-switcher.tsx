import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { MonthKey } from '../api/types'
import { currentMonth, formatMonth, shiftMonth } from '../lib/date'
import s from './month-switcher.module.scss'

interface MonthSwitcherProps {
  value: MonthKey
  onChange: (month: MonthKey) => void
}

/** «‹ Октябрь 2026 ›». В будущее не листается — там пока нет операций. */
export function MonthSwitcher({ value, onChange }: MonthSwitcherProps) {
  const isCurrent = value >= currentMonth()
  return (
    <div className={s.root}>
      <button type="button" className={s.arrow} onClick={() => onChange(shiftMonth(value, -1))} aria-label="Предыдущий месяц">
        <ChevronLeft />
      </button>
      <span className={s.label} aria-live="polite">
        {formatMonth(value)}
      </span>
      <button type="button" className={s.arrow} onClick={() => onChange(shiftMonth(value, 1))} disabled={isCurrent} aria-label="Следующий месяц">
        <ChevronRight />
      </button>
    </div>
  )
}
