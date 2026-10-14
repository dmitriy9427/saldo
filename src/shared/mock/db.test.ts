import { describe, expect, it } from 'vitest'

import { ValidationError, createDb } from './db'
import { TEST_NOW } from './node'

const fresh = () => createDb(null, () => TEST_NOW)

const expense = { type: 'expense', date: '2026-10-14', amount: 50_000, accountId: 'card', categoryId: 'cafe', toAccountId: null, note: 'Тест' }

describe('демо-база', () => {
  it('одинаковое зерно — одинаковые данные (детерминированный генератор)', () => {
    expect(fresh().snapshot().transactions).toEqual(fresh().snapshot().transactions)
  })

  it('фильтр, пагинация и итоги по всей выборке, а не по странице', () => {
    const db = fresh()
    const all = db.transactions({ from: '2026-10-01', to: '2026-10-31', type: 'expense', pageSize: 5 })
    expect(all.items).toHaveLength(5)
    expect(all.total).toBeGreaterThan(5)
    const sum = db
      .transactions({ from: '2026-10-01', to: '2026-10-31', type: 'expense', pageSize: 100 })
      .items.reduce((s, t) => s + t.amount, 0)
    expect(all.totals.expense).toBe(sum)
  })

  it('поиск по заметке и по названию категории', () => {
    const db = fresh()
    expect(db.transactions({ q: 'пятёрочка' }).items.every((t) => t.note === 'Пятёрочка')).toBe(true)
    expect(db.transactions({ q: 'зарплата' }).items.every((t) => t.categoryId === 'salary')).toBe(true)
  })

  it('остаток счёта = начальный ± операции; перевод не меняет общий баланс', () => {
    const db = fresh()
    const total = () => db.accounts().reduce((s, a) => s + a.balance, 0)
    const before = total()
    db.createTransaction({ ...expense, type: 'transfer', categoryId: null, toAccountId: 'savings' })
    expect(total()).toBe(before)
    db.createTransaction(expense)
    expect(total()).toBe(before - 50_000)
  })

  it('проверка на сервере: ошибки по полям', () => {
    const db = fresh()
    const error = (() => {
      try {
        db.createTransaction({ ...expense, amount: -5, categoryId: 'salary' })
      } catch (e) {
        return e as ValidationError
      }
    })()
    expect(error).toBeInstanceOf(ValidationError)
    expect(error!.body.fields).toEqual({ amount: 'Сумма должна быть больше нуля', categoryId: 'Это категория доходов' })
  })

  it('импорт пачкой пропускает дубликаты — повторный импорт ничего не задваивает', () => {
    const db = fresh()
    const rows = [expense, { ...expense, amount: 10_000 }]
    expect(db.bulkCreate(rows)).toEqual({ created: 2, skipped: 0 })
    expect(db.bulkCreate(rows)).toEqual({ created: 0, skipped: 2 })
  })

  it('бюджет: потрачено за месяц по категории', () => {
    const db = fresh()
    const before = db.budgets('2026-10').find((b) => b.categoryId === 'cafe')!.spent
    db.createTransaction(expense)
    expect(db.budgets('2026-10').find((b) => b.categoryId === 'cafe')!.spent).toBe(before + 50_000)
  })

  it('итоги месяца: переводы не считаются ни доходом, ни расходом', () => {
    const db = fresh()
    const before = db.summary('2026-10')
    db.createTransaction({ ...expense, type: 'transfer', categoryId: null, toAccountId: 'cash' })
    const after = db.summary('2026-10')
    expect([after.income, after.expense]).toEqual([before.income, before.expense])
  })
})
