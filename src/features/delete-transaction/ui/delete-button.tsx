import { Trash2 } from 'lucide-react'

import type { Transaction } from '@/shared/api'
import { useAppDispatch } from '@/shared/model'
import { Button } from '@/shared/ui'

import { deleteRequested } from '../model/delete-flow'

export function DeleteTransactionButton({ transaction }: { transaction: Transaction }) {
  const dispatch = useAppDispatch()
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<Trash2 />}
      aria-label="Удалить операцию"
      title="Удалить"
      onClick={() => dispatch(deleteRequested(transaction))}
    />
  )
}
