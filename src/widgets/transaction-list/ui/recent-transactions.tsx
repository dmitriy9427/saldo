import { Link } from 'react-router'

import { useGetTransactionsQuery } from '@/entities/transaction'
import { errorMessage } from '@/shared/api'
import { Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui'

import { TransactionGroups } from './transaction-groups'
import s from './transaction-list.module.scss'

/** Последние операции на главной. Тот же эндпоинт, что у списка, — общий кеш и теги. */
export function RecentTransactions({ limit = 6 }: { limit?: number }) {
  const { data, error, isLoading, isFetching, refetch } = useGetTransactionsQuery({ page: 1, pageSize: limit })
  return (
    <Card
      title="Последние операции"
      action={
        <Link to="/transactions" className={s.more}>
          Все
        </Link>
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} />
      ) : isLoading || !data ? (
        <div className={s.skeleton}>
          {Array.from({ length: limit }, (_, i) => (
            <Skeleton key={i} height={44} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="Операций пока нет" text="Нажмите N, чтобы добавить первую." />
      ) : (
        <TransactionGroups items={data.items} actions={false} />
      )}
    </Card>
  )
}
