/**
 * Схема формы операции (zod) и перевод «форма ↔ API».
 *
 * Сумма в форме — СТРОКА («1 250,50»): так пользователь её вводит, и так её
 * удобно редактировать. В копейки превращаем только при отправке (toInput).
 * Хранить в форме число — значит ломать ввод: «12,» → NaN.
 *
 * Сервер проверяет всё ещё раз (shared/mock/db.ts → validate) и при ошибке
 * отвечает 422 с ошибками по полям — форма покажет их под полями так же,
 * как свои (setError в transaction-form.tsx).
 */
import { z } from 'zod'

import type { Transaction, TransactionInput } from '@/shared/api'
import { parseMoney, today } from '@/shared/lib'

export const transactionFormSchema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']),
    amount: z
      .string()
      .trim()
      .min(1, 'Введите сумму')
      .refine((v) => !v || parseMoney(v) !== null, 'Не похоже на сумму')
      // Одна ошибка за раз: «больше нуля» проверяем, только если сумма распознана.
      .refine((v) => (parseMoney(v) ?? 1) > 0, 'Сумма должна быть больше нуля'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Выберите дату'),
    accountId: z.string().min(1, 'Выберите счёт'),
    toAccountId: z.string(),
    categoryId: z.string(),
    note: z.string().max(200, 'Не длиннее 200 символов'),
  })
  // Правила, зависящие от нескольких полей: для перевода нужен второй счёт,
  // для расхода и дохода — категория.
  .superRefine((v, ctx) => {
    if (v.type === 'transfer') {
      if (!v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Куда перевести?' })
      else if (v.toAccountId === v.accountId)
        ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Выберите другой счёт' })
    } else if (!v.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Выберите категорию' })
    }
  })

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

/** Значения формы → тело запроса API. */
export function toInput(values: TransactionFormValues): TransactionInput {
  const transfer = values.type === 'transfer'
  return {
    type: values.type,
    amount: parseMoney(values.amount)!,
    date: values.date,
    accountId: values.accountId,
    toAccountId: transfer ? values.toAccountId : null,
    categoryId: transfer ? null : values.categoryId,
    note: values.note.trim(),
  }
}

/** Операция (или пустая форма) → значения формы. */
export function toFormValues(t?: Transaction | null, preset: Partial<TransactionFormValues> = {}): TransactionFormValues {
  if (t) {
    return {
      type: t.type,
      // Без пробелов-разделителей: «1250,5» удобнее править, чем «1 250,50 ₽».
      amount: (t.amount / 100).toString().replace('.', ','),
      date: t.date,
      accountId: t.accountId,
      toAccountId: t.toAccountId ?? '',
      categoryId: t.categoryId ?? '',
      note: t.note,
    }
  }
  return { type: 'expense', amount: '', date: today(), accountId: 'card', toAccountId: '', categoryId: '', note: '', ...preset }
}
