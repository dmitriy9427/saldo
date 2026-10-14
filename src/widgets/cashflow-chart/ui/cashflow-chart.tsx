import { Bar, BarChart, type BarShapeProps, CartesianGrid, Tooltip, type TooltipContentProps, XAxis, YAxis } from 'recharts'

import { useGetCashflowQuery } from '@/entities/report'
import { type CashflowPoint, type MonthKey, errorMessage } from '@/shared/api'
import { cx, formatAxis, formatMonth } from '@/shared/lib'
import { Card, ErrorState, Money, Skeleton } from '@/shared/ui'

import s from './cashflow-chart.module.scss'

interface CashflowChartProps {
  /** Выбранный месяц — подсвечен; клик по столбику выбирает другой. */
  month: MonthKey
  onSelect?: (month: MonthKey) => void
  end: MonthKey
}

/**
 * Доходы и расходы за 12 месяцев (Recharts).
 *
 * Цвета — через CSS: fill="currentColor", а цвет задаёт класс столбиков.
 * Так график сам перекрашивается при смене темы (CSS-переменные), без
 * перерисовки из JS.
 */
export function CashflowChart({ month, onSelect, end }: CashflowChartProps) {
  const { data, error, isLoading, isFetching, refetch } = useGetCashflowQuery({ months: 12, end })

  return (
    <Card title="Доходы и расходы" action={<Legend />} className={s.card}>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !data ? (
        <Skeleton height={280} />
      ) : (
        <div className={s.chart}>
          <BarChart
            responsive
            style={{ width: '100%', height: 280 }}
            data={data}
            barGap={3}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            onClick={(state) => {
              const index = Number(state.activeTooltipIndex)
              const point = Number.isInteger(index) ? data[index] : undefined
              if (point && onSelect) onSelect(point.month)
            }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} className={s.grid} />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => formatMonth(m, 'short')}
              tickLine={false}
              axisLine={false}
              className={s.axis}
              interval="preserveStartEnd"
              minTickGap={2}
              fontSize={12}
            />
            <YAxis tickFormatter={formatAxis} tickLine={false} axisLine={false} width={44} className={s.axis} />
            <Tooltip cursor={{ className: s.cursor }} content={TooltipContent} />
            <Bar dataKey="income" name="Доходы" fill="currentColor" radius={[6, 6, 0, 0]} maxBarSize={22} className={s.income} shape={(props: BarShapeProps) => <Column {...props} selected={(props.payload as CashflowPoint | undefined)?.month === month} />} />
            <Bar dataKey="expense" name="Расходы" fill="currentColor" radius={[6, 6, 0, 0]} maxBarSize={22} className={s.expense} shape={(props: BarShapeProps) => <Column {...props} selected={(props.payload as CashflowPoint | undefined)?.month === month} />} />
          </BarChart>
        </div>
      )}
    </Card>
  )
}

/** Столбик со скруглённым верхом; невыбранные месяцы — бледнее. */
function Column({ x = 0, y = 0, width = 0, height = 0, selected }: { x?: number; y?: number; width?: number; height?: number; selected: boolean }) {
  const r = Math.min(6, width / 2, height)
  const path = height <= 0 ? '' : `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
  return <path d={path} fill="currentColor" className={cx(s.column, selected && s.selected)} />
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as CashflowPoint | undefined
  if (!active || !point) return null
  const net = point.income - point.expense
  return (
    <div className={s.tooltip}>
      <p className={s.tooltipTitle}>{formatMonth(point.month)}</p>
      <p>
        <i className={s.dotIncome} /> Доходы <Money value={point.income} trim />
      </p>
      <p>
        <i className={s.dotExpense} /> Расходы <Money value={point.expense} trim />
      </p>
      <p className={s.net}>
        Итог <Money value={net} sign trim tone="auto" />
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className={s.legend}>
      <span>
        <i className={s.dotIncome} /> Доходы
      </span>
      <span>
        <i className={s.dotExpense} /> Расходы
      </span>
    </div>
  )
}
