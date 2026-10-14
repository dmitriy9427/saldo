import { BudgetList } from '@/widgets/budget-list'
import { useMonthParam } from '@/shared/lib'
import { MonthSwitcher, PageHeader } from '@/shared/ui'

export function BudgetsPage() {
  const [month, setMonth] = useMonthParam()
  return (
    <>
      <PageHeader
        title="Бюджеты"
        subtitle="Месячные лимиты по категориям. Черта на полосе — сегодняшний день: заливка левее черты — укладываетесь."
        actions={<MonthSwitcher value={month} onChange={setMonth} />}
      />
      <BudgetList month={month} />
    </>
  )
}
