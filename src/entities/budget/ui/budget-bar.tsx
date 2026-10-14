import type { CSSProperties } from 'react'

import { cx } from '@/shared/lib'

import type { BudgetState } from '../lib/pace'
import s from './budget-bar.module.scss'

interface BudgetBarProps {
  used: number
  /** Отметка «сегодня»: какая часть месяца прошла. */
  elapsed?: number
  state: BudgetState
  label: string
}

/** Полоса бюджета с отметкой «сегодня». role="meter" — скринридер прочитает «78 %». */
export function BudgetBar({ used, elapsed, state, label }: BudgetBarProps) {
  return (
    <div
      className={cx(s.bar, s[state])}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(used * 100)}
      style={{ '--used': Math.min(used, 1), '--elapsed': elapsed ?? 0 } as CSSProperties}
    >
      <span className={s.fill} />
      {elapsed !== undefined && elapsed < 1 && <span className={s.today} title="Сегодня" />}
    </div>
  )
}
