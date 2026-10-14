import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react'

import { useGetTransactionsQuery } from '@/entities/transaction'
import { formOpened } from '@/features/transaction-form'
import { type TransactionQuery, errorMessage } from '@/shared/api'
import { cx } from '@/shared/lib'
import { useAppDispatch } from '@/shared/model'
import { Button, Card, EmptyState, ErrorState, Money, Skeleton } from '@/shared/ui'

import { TransactionGroups } from './transaction-groups'
import s from './transaction-list.module.scss'

interface TransactionListProps {
  query: TransactionQuery
  onPage: (page: number) => void
  onReset?: () => void
}

/** Список операций страницы «Операции»: итоги выборки, группы по дням, страницы. */
export function TransactionList({ query, onPage, onReset }: TransactionListProps) {
  const dispatch = useAppDispatch()
  // Ключ кеша — объект query целиком: те же фильтры — тот же кеш (RTK Query
  // сериализует аргументы, порядок ключей не важен). Вернулись на страницу 1 —
  // она уже есть, показываем мгновенно.
  const { data, error, isLoading, isFetching, refetch } = useGetTransactionsQuery(query)

  if (error) return <Card><ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} /></Card>

  if (isLoading || !data) {
    return (
      <Card>
        <div className={s.skeleton}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </div>
      </Card>
    )
  }

  const pages = Math.ceil(data.total / data.pageSize)

  return (
    <Card className={cx(s.card, isFetching && s.stale)} aria-busy={isFetching}>
      <div className={s.totals}>
        <span>
          Найдено: <b>{data.total}</b>
        </span>
        <span>
          Доходы <Money value={data.totals.income} sign trim tone="income" />
        </span>
        <span>
          Расходы <Money value={-data.totals.expense} trim />
        </span>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Ничего не нашлось"
          text="Попробуйте другой период или сбросьте фильтры."
          action={
            <div className={s.emptyActions}>
              {onReset && <Button onClick={onReset}>Сбросить фильтры</Button>}
              <Button variant="primary" onClick={() => dispatch(formOpened())}>
                Добавить операцию
              </Button>
            </div>
          }
        />
      ) : (
        <TransactionGroups items={data.items} grouped={query.sort !== 'amount'} />
      )}

      {pages > 1 && (
        <nav className={s.pager} aria-label="Страницы">
          <Button size="sm" icon={<ChevronLeft />} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} aria-label="Предыдущая страница" />
          <span className={s.page}>
            {data.page} из {pages}
          </span>
          <Button size="sm" icon={<ChevronRight />} disabled={data.page >= pages} onClick={() => onPage(data.page + 1)} aria-label="Следующая страница" />
        </nav>
      )}
    </Card>
  )
}
