import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank } from 'lucide-react'
import type { ReactNode } from 'react'

import { useGetAccountsQuery } from '@/entities/account'
import { useGetMonthSummaryQuery } from '@/entities/report'
import { type MonthKey, errorMessage } from '@/shared/api'
import { changeRatio, currentMonth, cx, formatMonth, formatPercent, shiftMonth } from '@/shared/lib'
import { ErrorState, Money, Skeleton } from '@/shared/ui'

import s from './month-summary.module.scss'

/** Четыре карточки сверху главной: всего денег, доходы, расходы, сколько отложено. */
export function MonthSummary({ month }: { month: MonthKey }) {
  const summary = useGetMonthSummaryQuery(month)
  const accounts = useGetAccountsQuery()

  if (summary.error) return <ErrorState message={errorMessage(summary.error)} onRetry={summary.refetch} retrying={summary.isFetching} />

  const data = summary.data
  const total = accounts.data?.reduce((sum, a) => sum + a.balance, 0)
  const prev = shiftMonth(month, -1)
  const saved = data ? data.income - data.expense : 0
  const rate = data && data.income > 0 ? saved / data.income : null

  return (
    // isFetching (а не isLoading): при смене месяца старые цифры полупрозрачны, пока грузятся новые.
    <div className={cx(s.grid, summary.isFetching && !summary.isLoading && s.stale)}>
      <Stat label="На всех счетах" icon={<Landmark />} tone="accent" value={total} hint={`${accounts.data?.length ?? '…'} счёта`} />
      <Stat
        label="Доходы"
        icon={<ArrowDownRight />}
        tone="income"
        value={data?.income}
        hint={data && <Change current={data.income} previous={data.previous.income} goodWhenUp month={prev} />}
      />
      <Stat
        label="Расходы"
        icon={<ArrowUpRight />}
        tone="expense"
        value={data?.expense}
        hint={data && <Change current={data.expense} previous={data.previous.expense} month={prev} />}
      />
      <Stat
        label={saved >= 0 ? 'Отложено' : 'Ушло больше, чем пришло'}
        icon={<PiggyBank />}
        tone="savings"
        value={data ? saved : undefined}
        hint={
          rate !== null && rate >= 0
            ? `${formatPercent(rate)} от доходов`
            : month === currentMonth()
              ? 'Месяц ещё не закончился'
              : 'Тратили больше, чем зарабатывали'
        }
      />
    </div>
  )
}

function Stat({ label, icon, value, hint, tone }: { label: string; icon: ReactNode; value: number | undefined; hint: ReactNode; tone: string }) {
  return (
    <div className={cx(s.stat, s[tone])}>
      <div className={s.head}>
        <span className={s.icon} aria-hidden>{icon}</span>
        {label}
      </div>
      <div className={s.value}>{value === undefined ? <Skeleton width={140} height={30} /> : <Money value={value} trim />}</div>
      <div className={s.hint}>{value === undefined ? <Skeleton width={110} height={14} /> : hint}</div>
    </div>
  )
}

/** «▲ 12 % к сентябрю». Для расходов рост — плохо (красный), для доходов — хорошо. */
function Change({ current, previous, goodWhenUp, month }: { current: number; previous: number; goodWhenUp?: boolean; month: MonthKey }) {
  const ratio = changeRatio(current, previous)
  if (ratio === null) return <>Нет данных за {formatMonth(month, 'long').toLowerCase()}</>
  const up = ratio > 0
  const good = up === Boolean(goodWhenUp)
  return (
    <span className={cx(s.change, Math.abs(ratio) >= 0.005 && (good ? s.good : s.bad))}>
      {up ? '▲' : '▼'} {formatPercent(Math.abs(ratio))} к {formatMonth(month, 'dative')}
    </span>
  )
}
