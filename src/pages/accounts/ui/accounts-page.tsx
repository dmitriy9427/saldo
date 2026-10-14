import { AccountsOverview } from '@/widgets/accounts-overview'
import { PageHeader } from '@/shared/ui'

export function AccountsPage() {
  return (
    <>
      <PageHeader title="Счета" subtitle="Остатки и как менялись деньги за год" />
      <AccountsOverview />
    </>
  )
}
