import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { BudgetBar, budgetPace, useDeleteBudgetMutation, useGetBudgetsQuery } from '@/entities/budget'
import { CategoryIcon, useCategoryMap } from '@/entities/category'
import { BudgetFormModal } from '@/features/set-budget'
import { formOpened } from '@/features/transaction-form'
import { type BudgetStatus, type MonthKey, errorMessage } from '@/shared/api'
import { currentMonth, cx, formatMonth, formatPercent, monthRange } from '@/shared/lib'
import { useAppDispatch } from '@/shared/model'
import { Button, Card, EmptyState, ErrorState, Money, Skeleton } from '@/shared/ui'

import s from './budget-list.module.scss'

interface BudgetListProps {
  month: MonthKey
  /** Компактно для главной: первые 4, без кнопок. */
  compact?: boolean
}

/** Какой день месяца считать «сегодня»: для прошлых месяцев — последний. */
function dayOf(month: MonthKey) {
  const days = Number(monthRange(month).to.slice(8))
  const day = month === currentMonth() ? new Date().getDate() : month < currentMonth() ? days : 0
  return { day, days }
}

export function BudgetList({ month, compact }: BudgetListProps) {
  const { data, error, isLoading, isFetching, refetch } = useGetBudgetsQuery(month)
  const { byId } = useCategoryMap()
  const [editing, setEditing] = useState<BudgetStatus | null | undefined>(undefined)
  const [remove] = useDeleteBudgetMutation()
  const dispatch = useAppDispatch()
  const { day, days } = dayOf(month)

  // Сначала самые «горящие»: перерасход, затем по доле потраченного.
  const sorted = [...(data ?? [])].sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  const shown = compact ? sorted.slice(0, 4) : sorted

  const action = compact ? (
    <Link to="/budgets" className={s.more}>
      Все
    </Link>
  ) : (
    <Button size="sm" icon={<Plus />} onClick={() => setEditing(null)}>
      Бюджет
    </Button>
  )

  return (
    <Card title={compact ? 'Бюджеты' : `Лимиты на ${formatMonth(month, 'long').toLowerCase()}`} action={action} className={cx(isFetching && !isLoading && s.stale)}>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} />
      ) : isLoading ? (
        <div className={s.list}>
          {Array.from({ length: compact ? 4 : 6 }, (_, i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      ) : !shown.length ? (
        <EmptyState
          icon={<Target />}
          title="Бюджетов пока нет"
          text="Поставьте месячный лимит на категорию — увидите, успеваете ли уложиться."
          action={!compact && <Button onClick={() => setEditing(null)}>Добавить бюджет</Button>}
        />
      ) : (
        <ul className={cx(s.list, !compact && s.grid)}>
          {shown.map((budget) => {
            const category = byId.get(budget.categoryId)
            const pace = budgetPace(budget.spent, budget.limit, day, days)
            const name = category?.name ?? budget.categoryId
            return (
              <li key={budget.categoryId} className={cx(s.item, !compact && s.full)}>
                <div className={s.head}>
                  <CategoryIcon category={category} size="sm" />
                  <span className={s.name}>{name}</span>
                  <span className={s.numbers}>
                    <Money value={budget.spent} trim /> <span className={s.of}>из</span> <Money value={budget.limit} trim className={s.of} />
                  </span>
                </div>
                <BudgetBar used={pace.used} elapsed={day > 0 ? pace.elapsed : undefined} state={pace.state} label={`${name}: потрачено ${formatPercent(pace.used)}`} />
                <p className={cx(s.status, s[pace.state])}>
                  {pace.state === 'over' ? (
                    <>
                      Перерасход <Money value={-pace.left} trim />
                    </>
                  ) : month !== currentMonth() ? (
                    <>
                      Осталось <Money value={pace.left} trim />
                    </>
                  ) : pace.state === 'warning' ? (
                    <>
                      При таком темпе выйдет <Money value={pace.forecast} trim /> — притормозите
                    </>
                  ) : (
                    <>
                      Можно <Money value={pace.perDay} trim /> в день
                    </>
                  )}
                </p>
                {!compact && (
                  <div className={s.actions}>
                    <Button size="sm" variant="ghost" onClick={() => dispatch(formOpened({ preset: { type: 'expense', categoryId: budget.categoryId } }))}>
                      Добавить трату
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Pencil />} aria-label={`Изменить лимит «${name}»`} onClick={() => setEditing(budget)} />
                    <Button size="sm" variant="ghost" icon={<Trash2 />} aria-label={`Удалить бюджет «${name}»`} onClick={() => remove(budget.categoryId)} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!compact && (
        <BudgetFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} budget={editing} taken={(data ?? []).map((b) => b.categoryId)} />
      )}
    </Card>
  )
}
