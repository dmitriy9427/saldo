import { describe, expect, it } from 'vitest'

import { toFormValues, toInput, transactionFormSchema } from './schema'

const base = toFormValues(null, { date: '2026-10-14' })

const issues = (values: object) =>
  transactionFormSchema.safeParse({ ...base, ...values }).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? []

describe('схема формы операции', () => {
  it('пустая форма: сумма и категория', () => {
    expect(issues({})).toEqual(['amount: Введите сумму', 'categoryId: Выберите категорию'])
  })

  it('сумма — строка пользователя, проверяется как деньги', () => {
    expect(issues({ amount: 'abc', categoryId: 'cafe' })).toEqual(['amount: Не похоже на сумму'])
    expect(issues({ amount: '0', categoryId: 'cafe' })).toEqual(['amount: Сумма должна быть больше нуля'])
    expect(issues({ amount: '1 250,50', categoryId: 'cafe' })).toEqual([])
  })

  it('перевод: нужен другой счёт, категория не нужна', () => {
    expect(issues({ type: 'transfer', amount: '100' })).toEqual(['toAccountId: Куда перевести?'])
    expect(issues({ type: 'transfer', amount: '100', toAccountId: 'card' })).toEqual(['toAccountId: Выберите другой счёт'])
    expect(issues({ type: 'transfer', amount: '100', toAccountId: 'savings' })).toEqual([])
  })

  it('форма → API: копейки, у перевода нет категории', () => {
    expect(toInput({ ...base, type: 'transfer', amount: '1 000,5', toAccountId: 'cash', categoryId: 'cafe' })).toMatchObject({
      amount: 100050,
      categoryId: null,
      toAccountId: 'cash',
    })
  })

  it('операция → форма: сумма для редактирования без разрядов', () => {
    const values = toFormValues({ id: 't1', type: 'expense', date: '2026-10-01', amount: 125050, accountId: 'card', toAccountId: null, categoryId: 'cafe', note: '', createdAt: '' })
    expect(values.amount).toBe('1250,5')
  })
})
