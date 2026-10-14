import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { toastShown, useAppDispatch } from '@/shared/model'
import { Button, Modal } from '@/shared/ui'

import { useResetDemoMutation } from '../api/reset-api'

export function ResetDemoButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [reset, { isLoading }] = useResetDemoMutation()
  const dispatch = useAppDispatch()
  return (
    <>
      <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setOpen(true)} className={className}>
        Сбросить демо
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Вернуть демо-данные?"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button
              variant="danger"
              loading={isLoading}
              onClick={async () => {
                await reset().unwrap()
                setOpen(false)
                dispatch(toastShown({ message: 'Демо-данные восстановлены' }))
              }}
            >
              Сбросить
            </Button>
          </>
        }
      >
        <p>Ваши операции, бюджеты и импорт удалятся, вернутся исходные демо-данные. Данные хранятся только в этом браузере.</p>
      </Modal>
    </>
  )
}
