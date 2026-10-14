import { CategoryBreakdown } from '@/widgets/category-breakdown'
import { CashflowChart } from '@/widgets/cashflow-chart'
import { BudgetList } from '@/widgets/budget-list'
import { MonthSummary } from '@/widgets/month-summary'
import { RecentTransactions } from '@/widgets/transaction-list'
import { currentMonth, useMonthParam } from '@/shared/lib'
import { MonthSwitcher, PageHeader } from '@/shared/ui'

import s from './dashboard-page.module.scss'

/**
 * Главная. Страница только раскладывает виджеты и хранит выбранный месяц
 * (в адресе). Сами данные каждый виджет берёт сам из RTK Query — один и тот же
 * запрос итогов месяца используют и карточки, и диаграмма, но на сервер он
 * уходит ОДИН раз: RTK Query объединяет одинаковые запросы.
 */
export function DashboardPage() {
  const [month, setMonth] = useMonthParam()
  return (
    <>
      <PageHeader title="Обзор" subtitle="Куда уходят деньги и сколько остаётся" actions={<MonthSwitcher value={month} onChange={setMonth} />} />
      <div className={s.grid}>
        <div className={s.wide}>
          <MonthSummary month={month} />
        </div>
        <CashflowChart month={month} onSelect={setMonth} end={currentMonth()} />
        <CategoryBreakdown month={month} />
        <BudgetList month={month} compact />
        <RecentTransactions />
      </div>
    </>
  )
}
