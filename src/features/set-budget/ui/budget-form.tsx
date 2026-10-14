import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useSetBudgetMutation } from '@/entities/budget'
import { useCategoryMap } from '@/entities/category'
import { type BudgetStatus, errorMessage, fieldErrors } from '@/shared/api'
import { formatMoney, parseMoney } from '@/shared/lib'
import { toastShown, useAppDispatch } from '@/shared/model'
import { Button, Field, Input, Modal, Select } from '@/shared/ui'

import s from './budget-form.module.scss'

const schema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  limit: z
    .string()
    .trim()
    .min(1, 'Введите лимит')
    .refine((v) => (parseMoney(v) ?? 0) > 0, 'Лимит должен быть больше нуля'),
})
type Values = z.infer<typeof schema>

interface BudgetFormModalProps {
  open: boolean
  onClose: () => void
  /** Правим этот бюджет; без него — новый. */
  budget?: BudgetStatus | null
  /** Категории, у которых бюджет уже есть, — их не предлагаем для нового. */
  taken: string[]
}

export function BudgetFormModal({ open, onClose, budget, taken }: BudgetFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Изменить лимит' : 'Новый бюджет'}>
      {open && <BudgetForm key={budget?.categoryId ?? 'new'} budget={budget} taken={taken} onDone={onClose} />}
    </Modal>
  )
}

function BudgetForm({ budget, taken, onDone }: { budget?: BudgetStatus | null; taken: string[]; onDone: () => void }) {
  const dispatch = useAppDispatch()
  const { categories, byId } = useCategoryMap()
  const [save, { isLoading }] = useSetBudgetMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: budget?.categoryId ?? '', limit: budget ? String(budget.limit / 100) : '' },
  })

  const options = categories.filter((c) => c.kind === 'expense' && (c.id === budget?.categoryId || !taken.includes(c.id)))

  async function onSubmit(values: Values) {
    const limit = parseMoney(values.limit)!
    try {
      await save({ categoryId: values.categoryId, limit }).unwrap()
      dispatch(toastShown({ message: `Лимит «${byId.get(values.categoryId)?.name}»: ${formatMoney(limit, { trim: true })} в месяц` }))
      onDone()
    } catch (error) {
      const fields = fieldErrors(error)
      if (fields.limit) setError('limit', { message: fields.limit })
      else if (fields.categoryId) setError('categoryId', { message: fields.categoryId })
      else setError('root', { message: errorMessage(error) })
    }
  }

  return (
    <form className={s.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Категория" error={errors.categoryId?.message}>
        {(a11y) => (
          <Select {...a11y} {...register('categoryId')} disabled={Boolean(budget)}>
            <option value="">Выберите категорию</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Лимит в месяц, ₽" error={errors.limit?.message}>
        {(a11y) => <Input {...a11y} {...register('limit')} inputMode="decimal" placeholder="10 000" data-autofocus autoComplete="off" />}
      </Field>
      {errors.root && <p className={s.error} role="alert">{errors.root.message}</p>}
      <div className={s.footer}>
        <Button onClick={onDone}>Отмена</Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          Сохранить
        </Button>
      </div>
    </form>
  )
}
