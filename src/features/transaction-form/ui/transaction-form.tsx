import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { useGetAccountsQuery } from '@/entities/account'
import { CategoryIcon, useCategoryMap } from '@/entities/category'
import { useCreateTransactionMutation, useUpdateTransactionMutation } from '@/entities/transaction'
import { errorMessage, fieldErrors } from '@/shared/api'
import { cx, formatMoney, parseMoney, today, yesterday } from '@/shared/lib'
import { toastShown, useAppDispatch, useAppSelector } from '@/shared/model'
import { Button, Field, Input, Modal, Segmented, Select } from '@/shared/ui'

import { formClosed, selectForm } from '../model/form-slice'
import { type TransactionFormValues, toFormValues, toInput, transactionFormSchema } from '../model/schema'
import s from './transaction-form.module.scss'

const TYPES = [
  { value: 'expense' as const, label: 'Расход' },
  { value: 'income' as const, label: 'Доход' },
  { value: 'transfer' as const, label: 'Перевод' },
]

const FIELDS = ['type', 'amount', 'date', 'accountId', 'toAccountId', 'categoryId', 'note'] as const

/** Модалка «Новая операция / Правка». Смонтирована один раз в app. */
export function TransactionFormModal() {
  const { open, editing } = useAppSelector(selectForm)
  const dispatch = useAppDispatch()
  return (
    <Modal open={open} onClose={() => dispatch(formClosed())} title={editing ? 'Правка операции' : 'Новая операция'}>
      {/* key: другая операция — новый экземпляр формы со своими значениями по умолчанию. */}
      {open && <TransactionForm key={editing?.id ?? 'new'} />}
    </Modal>
  )
}

function TransactionForm() {
  const { editing, preset } = useAppSelector(selectForm)
  const dispatch = useAppDispatch()
  const { data: accounts = [] } = useGetAccountsQuery()
  const { categories } = useCategoryMap()
  const [create, createState] = useCreateTransactionMutation()
  const [update, updateState] = useUpdateTransactionMutation()
  const saving = createState.isLoading || updateState.isLoading

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: toFormValues(editing, preset),
    // Сначала проверяем при отправке, а после первой ошибки — на каждый ввод:
    // не ругаемся, пока человек печатает, но сразу убираем ошибку, когда исправил.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  // useWatch — подписка на конкретные поля: перерисовка только при их изменении.
  const [type, amount, date] = useWatch({ control, name: ['type', 'amount', 'date'] })
  const kind = type === 'income' ? 'income' : 'expense'
  const visibleCategories = categories.filter((c) => c.kind === kind)

  // Сменили «Расход» на «Доход» — выбранная категория расходов больше не подходит.
  useEffect(() => {
    const current = categories.find((c) => c.id === getValues('categoryId'))
    if (current && current.kind !== kind) setValue('categoryId', '')
  }, [kind, categories, getValues, setValue])

  async function onSubmit(values: TransactionFormValues) {
    const input = toInput(values)
    try {
      if (editing) await update({ id: editing.id, patch: input }).unwrap()
      else await create(input).unwrap()
      dispatch(toastShown({ message: editing ? 'Изменения сохранены' : `Добавлено: ${formatMoney(input.amount, { trim: true })}` }))
      dispatch(formClosed())
    } catch (error) {
      // 422 — сервер не принял поля: показываем ошибки там же, где свои.
      const fields = fieldErrors(error)
      const known = FIELDS.filter((name) => fields[name])
      known.forEach((name) => setError(name, { message: fields[name] }))
      if (!known.length) setError('root', { message: errorMessage(error) })
    }
  }

  const parsed = parseMoney(amount)

  return (
    <form className={s.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Controller
        control={control}
        name="type"
        render={({ field }) => <Segmented label="Тип операции" value={field.value} onChange={field.onChange} options={TYPES} />}
      />

      <Field label="Сумма" error={errors.amount?.message} hint={parsed && parsed > 0 ? formatMoney(parsed) : 'Например, 1 250,50'}>
        {(a11y) => (
          <div className={s.amount}>
            <Input {...a11y} {...register('amount')} inputMode="decimal" autoComplete="off" placeholder="0" data-autofocus className={s.amountInput} />
            <span className={s.currency}>₽</span>
          </div>
        )}
      </Field>

      {type === 'transfer' ? (
        <div className={s.row}>
          <Field label="Откуда" error={errors.accountId?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('accountId')}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Куда" error={errors.toAccountId?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('toAccountId')}>
                <option value="">Выберите счёт</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      ) : (
        <fieldset className={s.categories} aria-invalid={errors.categoryId ? true : undefined}>
          <legend className={s.legend}>Категория</legend>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <div className={s.chips} role="radiogroup" aria-label="Категория">
                {visibleCategories.map((c) => (
                  <label key={c.id} className={cx(s.chip, field.value === c.id && s.selected)}>
                    <input type="radio" name={field.name} value={c.id} checked={field.value === c.id} onChange={() => field.onChange(c.id)} className={s.radio} />
                    <CategoryIcon category={c} size="sm" />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          />
          {errors.categoryId && <p className={s.error} role="alert">{errors.categoryId.message}</p>}
        </fieldset>
      )}

      <div className={s.row}>
        {type !== 'transfer' && (
          <Field label="Счёт" error={errors.accountId?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('accountId')}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label="Дата"
          error={errors.date?.message}
          hint={
            <span className={s.quick}>
              <button type="button" className={cx(s.link, date === today() && s.active)} onClick={() => setValue('date', today(), { shouldValidate: true })}>Сегодня</button>
              <button type="button" className={cx(s.link, date === yesterday() && s.active)} onClick={() => setValue('date', yesterday(), { shouldValidate: true })}>Вчера</button>
            </span>
          }
        >
          {(a11y) => <Input {...a11y} {...register('date')} type="date" max={today()} />}
        </Field>
      </div>

      <Field label="Заметка" error={errors.note?.message}>
        {(a11y) => <Input {...a11y} {...register('note')} placeholder="Например, «Пятёрочка»" maxLength={200} />}
      </Field>

      {errors.root && <p className={s.error} role="alert">{errors.root.message}</p>}

      <div className={s.footer}>
        <Button onClick={() => dispatch(formClosed())}>Отмена</Button>
        <Button type="submit" variant="primary" loading={saving}>
          {editing ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
