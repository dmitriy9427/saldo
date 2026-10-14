import { useState } from 'react'
import { Link } from 'react-router'
import { Cell, Pie, PieChart } from 'recharts'

import { CategoryIcon, useCategoryMap } from '@/entities/category'
import { useGetMonthSummaryQuery } from '@/entities/report'
import { type MonthKey, errorMessage } from '@/shared/api'
import { cx, formatPercent } from '@/shared/lib'
import { Card, EmptyState, ErrorState, Money, Skeleton } from '@/shared/ui'

import s from './category-breakdown.module.scss'

const TOP = 6

/**
 * Куда ушли деньги за месяц: «бублик» + список категорий с долями.
 * Наведение на строку подсвечивает сектор и наоборот — общее состояние hovered.
 * Клик по категории — список её операций за этот месяц (фильтр в адресе).
 */
export function CategoryBreakdown({ month }: { month: MonthKey }) {
  const { data, error, isLoading, isFetching, refetch } = useGetMonthSummaryQuery(month)
  const { byId } = useCategoryMap()
  const [hovered, setHovered] = useState<number | null>(null)

  if (error) {
    return (
      <Card title="Расходы по категориям">
        <ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} />
      </Card>
    )
  }

  const total = data?.expense ?? 0
  const items = (data?.byCategory ?? []).slice(0, TOP).map((item) => ({ ...item, category: byId.get(item.categoryId) }))
  const rest = (data?.byCategory ?? []).slice(TOP).reduce((sum, item) => sum + item.amount, 0)
  const slices = [...items.map((i) => ({ name: i.category?.name ?? '', value: i.amount, color: i.category?.color ?? '#999' }))]
  if (rest > 0) slices.push({ name: 'Остальное', value: rest, color: 'var(--border)' })

  return (
    <Card title="Расходы по категориям" className={cx(isFetching && !isLoading && s.stale)}>
      {isLoading || !data ? (
        <div className={s.layout}>
          <Skeleton width={180} height={180} radius={90} className={s.ring} />
          <div className={s.list}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={36} />
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <EmptyState title="В этом месяце расходов нет" />
      ) : (
        <div className={s.layout}>
          <div className={s.ring}>
            <PieChart width={180} height={180}>
              <Pie
                data={slices}
                dataKey="value"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={2}
                cornerRadius={4}
                stroke="none"
                isAnimationActive={false}
                onMouseEnter={(_, index) => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                {slices.map((slice, i) => (
                  <Cell key={slice.name} fill={slice.color} opacity={hovered === null || hovered === i ? 1 : 0.35} />
                ))}
              </Pie>
            </PieChart>
            <div className={s.center}>
              {hovered !== null && slices[hovered] ? (
                <>
                  <span className={s.centerLabel}>{slices[hovered].name}</span>
                  <Money value={slices[hovered].value} trim className={s.centerValue} />
                </>
              ) : (
                <>
                  <span className={s.centerLabel}>Всего</span>
                  <Money value={total} trim className={s.centerValue} />
                </>
              )}
            </div>
          </div>
          <ul className={s.list}>
            {items.map((item, i) => (
              <li key={item.categoryId}>
                <Link
                  to={`/transactions?category=${item.categoryId}&month=${month}`}
                  className={cx(s.item, hovered === i && s.hover)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                >
                  <CategoryIcon category={item.category} size="sm" />
                  <span className={s.name}>{item.category?.name}</span>
                  <span className={s.share}>{formatPercent(item.amount / total)}</span>
                  <Money value={item.amount} trim className={s.amount} />
                </Link>
              </li>
            ))}
            {rest > 0 && (
              <li className={cx(s.item, s.restItem)}>
                <span className={s.restDot} />
                <span className={s.name}>Остальное</span>
                <span className={s.share}>{formatPercent(rest / total)}</span>
                <Money value={rest} trim className={s.amount} />
              </li>
            )}
          </ul>
        </div>
      )}
    </Card>
  )
}
