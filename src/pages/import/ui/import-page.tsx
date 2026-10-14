import { ImportWizard } from '@/features/import-statement'
import { PageHeader } from '@/shared/ui'

export function ImportPage() {
  return (
    <>
      <PageHeader title="Импорт выписки" subtitle="Загрузите CSV из интернет-банка — операции разложатся по категориям сами." />
      <ImportWizard />
    </>
  )
}
