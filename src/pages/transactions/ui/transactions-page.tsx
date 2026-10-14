import { FileUp, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { TransactionFilters, useTransactionFilters } from '@/features/filter-transactions'
import { formOpened } from '@/features/transaction-form'
import { TransactionList } from '@/widgets/transaction-list'
import { useAppDispatch } from '@/shared/model'
import { Button, PageHeader } from '@/shared/ui'

import s from './transactions-page.module.scss'

export function TransactionsPage() {
  const { query, set, reset } = useTransactionFilters()
  const dispatch = useAppDispatch()
  return (
    <>
      <PageHeader
        title="Операции"
        actions={
          <>
            <Link to="/import" className={s.link}>
              <FileUp aria-hidden /> Импорт выписки
            </Link>
            <Button variant="primary" icon={<Plus />} onClick={() => dispatch(formOpened())}>
              Операция
            </Button>
          </>
        }
      />
      <div className={s.stack}>
        <TransactionFilters />
        <TransactionList
          query={query}
          onPage={(page) => {
            set({ page })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onReset={reset}
        />
      </div>
    </>
  )
}
