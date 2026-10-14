import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Area, AreaChart, CartesianGrid, Tooltip, type TooltipContentProps, XAxis, YAxis } from 'recharts'

import { ACCOUNT_KIND_LABEL, AccountIcon, useGetAccountsQuery } from '@/entities/account'
import { useGetCashflowQuery } from '@/entities/report'
import { errorMessage } from '@/shared/api'
import { currentMonth, formatAxis, formatMonth, formatPercent } from '@/shared/lib'
import { Card, ErrorState, Money, Skeleton } from '@/shared/ui'

import { balanceHistory } from '../lib/balance-history'
import s from './accounts-overview.module.scss'

export function AccountsOverview() {
  const accounts = useGetAccountsQuery()
  const cashflow = useGetCashflowQuery({ months: 12, end: currentMonth() })
  const error = accounts.error ?? cashflow.error

  if (error) {
    return (
      <Card>
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => {
            void accounts.refetch()
            void cashflow.refetch()
          }}
        />
      </Card>
    )
  }

  const list = accounts.data
  const total = list?.reduce((sum, a) => sum + a.balance, 0) ?? 0
  const history = list && cashflow.data ? balanceHistory(cashflow.data, total) : null
  const yearAgo = history?.[0]?.balance

  return (
    <div className={s.root}>
      <Card className={s.hero}>
        <div className={s.total}>
          <span className={s.label}>Всего на счетах</span>
          {list ? <Money value={total} trim className={s.big} /> : <Skeleton width={220} height={40} />}
          {history && yearAgo !== undefined && (
            <span className={s.delta}>
              {total >= yearAgo ? '▲' : '▼'} <Money value={total - yearAgo} sign trim tone="auto" /> за год
            </span>
          )}
        </div>
        {history ? (
          <AreaChart responsive style={{ width: '100%', height: 220 }} data={history} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className={s.grid} />
            <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m, 'short')} tickLine={false} axisLine={false} className={s.axis} />
            <YAxis tickFormatter={formatAxis} tickLine={false} axisLine={false} width={60} className={s.axis} domain={['auto', 'auto']} />
            <Tooltip content={BalanceTooltip} />
            <Area type="monotone" dataKey="balance" stroke="currentColor" strokeWidth={2.5} fill="url(#balance-fill)" className={s.area} />
          </AreaChart>
        ) : (
          <Skeleton height={220} />
        )}
      </Card>

      <ul className={s.accounts}>
        {(list ?? []).map((account) => (
          <li key={account.id}>
            <Link to={`/transactions?account=${account.id}`} className={s.account} style={{ '--c': account.color } as CSSProperties}>
              <div className={s.accountHead}>
                <AccountIcon account={account} />
                <div>
                  <p className={s.accountName}>{account.name}</p>
                  <p className={s.accountKind}>{ACCOUNT_KIND_LABEL[account.kind]}</p>
                </div>
              </div>
              <Money value={account.balance} trim className={s.accountBalance} />
              <div className={s.share}>
                <span style={{ width: `${total > 0 ? (account.balance / total) * 100 : 0}%` }} />
              </div>
              <span className={s.accountShare}>{total > 0 ? formatPercent(account.balance / total) : '—'} от всех денег</span>
            </Link>
          </li>
        ))}
        {!list &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton height={150} radius={16} />
            </li>
          ))}
      </ul>
    </div>
  )
}

function BalanceTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as { month: string; balance: number } | undefined
  if (!active || !point) return null
  return (
    <div className={s.tooltip}>
      <span>На конец {formatMonth(point.month, 'genitive')}</span>
      <Money value={point.balance} trim />
    </div>
  )
}
