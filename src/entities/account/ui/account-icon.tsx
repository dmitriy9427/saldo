import { CreditCard, PiggyBank, Wallet } from 'lucide-react'
import type { CSSProperties } from 'react'

import type { Account } from '@/shared/api'

import s from './account-icon.module.scss'

const ICONS = { card: CreditCard, cash: Wallet, savings: PiggyBank }

export function AccountIcon({ account }: { account: Pick<Account, 'kind' | 'color'> }) {
  const Icon = ICONS[account.kind]
  return (
    <span className={s.icon} style={{ '--c': account.color } as CSSProperties} aria-hidden>
      <Icon />
    </span>
  )
}

export const ACCOUNT_KIND_LABEL: Record<Account['kind'], string> = {
  card: 'Карта',
  cash: 'Наличные',
  savings: 'Накопления',
}
