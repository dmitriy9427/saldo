import { Pencil } from 'lucide-react'

import { useGetAccountsQuery } from '@/entities/account'
import { CategoryIcon, useCategoryMap } from '@/entities/category'
import { TransactionRow, groupByDay } from '@/entities/transaction'
import { DeleteTransactionButton } from '@/features/delete-transaction'
import { formOpened } from '@/features/transaction-form'
import type { Transaction } from '@/shared/api'
import { formatDayHeading } from '@/shared/lib'
import { useAppDispatch } from '@/shared/model'
import { Button, Money } from '@/shared/ui'

import s from './transaction-list.module.scss'

/**
 * Операции, сгруппированные по дням, со строкой-итогом дня.
 * Здесь виджет СОБИРАЕТ строку: сущность операции (TransactionRow) +
 * сущности категории и счёта + фичи «изменить» и «удалить».
 */
export function TransactionGroups({ items, grouped = true, actions = true }: { items: Transaction[]; grouped?: boolean; actions?: boolean }) {
  const { byId: categories } = useCategoryMap()
  const { data: accounts = [] } = useGetAccountsQuery()
  const dispatch = useAppDispatch()
  const account = (id: string | null) => accounts.find((a) => a.id === id)

  const row = (t: Transaction) => (
    <li key={t.id}>
      <TransactionRow
        transaction={t}
        icon={<CategoryIcon category={t.categoryId ? categories.get(t.categoryId) : undefined} />}
        category={t.categoryId ? categories.get(t.categoryId) : undefined}
        account={account(t.accountId)}
        toAccount={account(t.toAccountId)}
        onOpen={() => dispatch(formOpened({ editing: t }))}
        actions={
          actions && (
            <>
              <Button variant="ghost" size="sm" icon={<Pencil />} aria-label="Изменить операцию" title="Изменить" onClick={() => dispatch(formOpened({ editing: t }))} />
              <DeleteTransactionButton transaction={t} />
            </>
          )
        }
      />
    </li>
  )

  // Сортировка по сумме — группы по дням бессмысленны, показываем плоский список.
  if (!grouped) return <ul className={s.rows}>{items.map(row)}</ul>

  return (
    <div className={s.groups}>
      {groupByDay(items).map((group) => (
        <section key={group.date} className={s.group} aria-label={formatDayHeading(group.date)}>
          <header className={s.day}>
            <span>{formatDayHeading(group.date)}</span>
            {group.net !== 0 && <Money value={group.net} sign trim tone="muted" />}
          </header>
          <ul className={s.rows}>{group.items.map(row)}</ul>
        </section>
      ))}
    </div>
  )
}
