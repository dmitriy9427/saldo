import { ArrowRightLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Account, Category, Transaction } from '@/shared/api'
import { Money } from '@/shared/ui'

import { signedAmount } from '../lib/group-by-day'
import s from './transaction-row.module.scss'

interface TransactionRowProps {
  transaction: Transaction
  /** Иконка категории — передаёт тот, кто собирает строку (виджет): сущность операции не знает о сущности категории. */
  icon: ReactNode
  category?: Category
  account?: Account
  toAccount?: Account
  /** Кнопки справа (редактировать, удалить) — из фич. */
  actions?: ReactNode
  onOpen?: () => void
}

/**
 * Строка операции. «Глупый» компонент: всё нужное приходит пропсами.
 * Так сущность не тянет за собой фичи и другие сущности (правило FSD),
 * а виджет собирает строку из частей.
 */
export function TransactionRow({ transaction: t, icon, category, account, toAccount, actions, onOpen }: TransactionRowProps) {
  // Категории ещё грузятся — «…», а не «Без категории» (иначе на миг мелькает неправда).
  const title = t.type === 'transfer' ? 'Перевод' : (category?.name ?? (t.categoryId ? '…' : 'Без категории'))
  const subtitle =
    t.type === 'transfer' ? `${account?.name ?? '…'} → ${toAccount?.name ?? '…'}` : [t.note, account?.name].filter(Boolean).join(' · ')

  return (
    <div className={s.row}>
      {t.type === 'transfer' ? (
        <span className={s.transfer} aria-hidden>
          <ArrowRightLeft />
        </span>
      ) : (
        icon
      )}
      <button type="button" className={s.main} onClick={onOpen} disabled={!onOpen}>
        <span className={s.title}>{title}</span>
        <span className={s.subtitle}>{subtitle}</span>
      </button>
      <Money
        value={signedAmount(t)}
        sign={t.type !== 'transfer'}
        trim
        tone={t.type === 'income' ? 'income' : t.type === 'transfer' ? 'muted' : undefined}
        className={s.amount}
      />
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  )
}
