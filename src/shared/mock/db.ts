/**
 * «База данных» демо-сервера: массивы в памяти + правила, которые на настоящем
 * бэкенде жили бы в SQL и сервисном слое (фильтры, пагинация, итоги, проверки).
 *
 * Приложение об этом файле не знает: оно ходит по HTTP (fetch), а MSW
 * перехватывает запросы и вызывает методы ниже (handlers.ts).
 */
import type {
  Account,
  ApiError,
  BudgetStatus,
  BulkResult,
  CashflowPoint,
  ID,
  MonthKey,
  MonthSummary,
  Transaction,
  TransactionInput,
  TransactionPage,
  TransactionQuery,
} from '../api/types'
import { lastMonths, monthOf, shiftMonth, toISODate } from '../lib/date'
import { type Dataset, createSeed } from './seed'

/** Ошибка проверки — сервер ответит 422 с ошибками по полям. */
export class ValidationError extends Error {
  readonly body: ApiError
  constructor(fields: Record<string, string>) {
    super('Проверьте поля формы')
    this.body = { message: this.message, fields }
  }
}

export class NotFoundError extends Error {}

export interface Db {
  snapshot(): Dataset
  reset(): void
  onChange?: () => void
  accounts(): Account[]
  categories(): Dataset['categories']
  transactions(query: TransactionQuery): TransactionPage
  transaction(id: ID): Transaction
  createTransaction(input: unknown): Transaction
  updateTransaction(id: ID, patch: unknown): Transaction
  deleteTransaction(id: ID): void
  bulkCreate(inputs: unknown[]): BulkResult
  summary(month: MonthKey): MonthSummary
  cashflow(months: number, end?: MonthKey): CashflowPoint[]
  budgets(month: MonthKey): BudgetStatus[]
  setBudget(categoryId: ID, limit: unknown): BudgetStatus
  deleteBudget(categoryId: ID): void
}

export function createDb(initial?: Dataset | null, now = () => new Date()): Db {
  let data: Dataset = initial ?? createSeed(now())
  let seq = Date.now()

  const changed = () => db.onChange?.()

  /** Сортировка «новые сверху»: по дате, внутри дня — по времени создания. */
  const byDateDesc = (a: Transaction, b: Transaction) =>
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

  /**
   * Проверка входных данных. Сервер НЕ доверяет клиенту: даже если форма уже
   * всё проверила, запрос можно отправить в обход формы (curl, DevTools).
   */
  function validate(raw: unknown, base?: Transaction): TransactionInput {
    const input = { ...base, ...(raw as Partial<TransactionInput>) }
    const fields: Record<string, string> = {}
    const accountIds = new Set(data.accounts.map((a) => a.id))
    const category = data.categories.find((c) => c.id === input.categoryId)

    if (!['expense', 'income', 'transfer'].includes(input.type as string)) fields.type = 'Неизвестный тип операции'
    if (!Number.isSafeInteger(input.amount) || (input.amount as number) <= 0) fields.amount = 'Сумма должна быть больше нуля'
    else if ((input.amount as number) > 100_000_000_00) fields.amount = 'Слишком большая сумма'
    if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fields.date = 'Неверная дата'
    if (!accountIds.has(input.accountId as string)) fields.accountId = 'Выберите счёт'

    if (input.type === 'transfer') {
      if (!accountIds.has(input.toAccountId as string)) fields.toAccountId = 'Выберите счёт-получатель'
      else if (input.toAccountId === input.accountId) fields.toAccountId = 'Перевод на тот же счёт'
    } else if (!category) {
      fields.categoryId = 'Выберите категорию'
    } else if (category.kind !== input.type) {
      fields.categoryId = input.type === 'income' ? 'Это категория расходов' : 'Это категория доходов'
    }
    if (typeof input.note === 'string' && input.note.length > 200) fields.note = 'Не длиннее 200 символов'

    if (Object.keys(fields).length) throw new ValidationError(fields)
    return {
      type: input.type!,
      date: input.date!,
      amount: input.amount!,
      accountId: input.accountId!,
      toAccountId: input.type === 'transfer' ? input.toAccountId! : null,
      categoryId: input.type === 'transfer' ? null : input.categoryId!,
      note: (input.note ?? '').trim(),
    }
  }

  function find(id: ID) {
    const t = data.transactions.find((x) => x.id === id)
    if (!t) throw new NotFoundError(`Операция ${id} не найдена`)
    return t
  }

  /** Расходы и доходы по категориям за месяц (переводы не считаются — деньги не ушли). */
  function totalsFor(month: MonthKey) {
    let income = 0
    let expense = 0
    const byCategory = new Map<ID, number>()
    for (const t of data.transactions) {
      if (monthOf(t.date) !== month) continue
      if (t.type === 'income') income += t.amount
      if (t.type === 'expense') {
        expense += t.amount
        byCategory.set(t.categoryId!, (byCategory.get(t.categoryId!) ?? 0) + t.amount)
      }
    }
    return { income, expense, byCategory }
  }

  const db: Db = {
    snapshot: () => data,
    reset() {
      data = createSeed(now())
      changed()
    },

    accounts() {
      return data.accounts.map((account) => {
        let balance = account.initialBalance
        for (const t of data.transactions) {
          if (t.accountId === account.id) balance += t.type === 'income' ? t.amount : -t.amount
          if (t.toAccountId === account.id) balance += t.amount
        }
        return { ...account, balance }
      })
    },

    categories: () => data.categories,

    transactions(query) {
      const q = query.q?.trim().toLowerCase()
      const names = new Map(data.categories.map((c) => [c.id, c.name.toLowerCase()]))
      const filtered = data.transactions.filter(
        (t) =>
          (!query.from || t.date >= query.from) &&
          (!query.to || t.date <= query.to) &&
          (!query.type || t.type === query.type) &&
          // Фильтр по счёту находит и переводы НА этот счёт.
          (!query.accountId || t.accountId === query.accountId || t.toAccountId === query.accountId) &&
          (!query.categoryId || t.categoryId === query.categoryId) &&
          (!q || t.note.toLowerCase().includes(q) || (t.categoryId && names.get(t.categoryId)?.includes(q))),
      )

      const dir = query.dir === 'asc' ? -1 : 1
      filtered.sort((a, b) =>
        query.sort === 'amount' ? dir * (b.amount - a.amount) || byDateDesc(a, b) : dir * byDateDesc(a, b),
      )

      const totals = { income: 0, expense: 0 }
      for (const t of filtered) {
        if (t.type === 'income') totals.income += t.amount
        if (t.type === 'expense') totals.expense += t.amount
      }

      const pageSize = Math.min(Math.max(query.pageSize ?? 30, 1), 100)
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
      const page = Math.min(Math.max(query.page ?? 1, 1), pages)
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        page,
        pageSize,
        totals,
      }
    },

    transaction: (id) => find(id),

    createTransaction(raw) {
      const t: Transaction = { ...validate(raw), id: `t${++seq}`, createdAt: now().toISOString() }
      data.transactions.push(t)
      changed()
      return t
    },

    updateTransaction(id, patch) {
      const current = find(id)
      Object.assign(current, validate(patch, current))
      changed()
      return current
    },

    deleteTransaction(id) {
      find(id)
      data.transactions = data.transactions.filter((t) => t.id !== id)
      changed()
    },

    bulkCreate(inputs) {
      // Дубликат — та же дата, сумма, тип, счёт и заметка: повторный импорт той же
      // выписки ничего не задвоит.
      const key = (t: TransactionInput) => [t.date, t.amount, t.type, t.accountId, t.note.toLowerCase()].join('|')
      const existing = new Set(data.transactions.map(key))
      const valid = inputs.map((raw) => validate(raw)) // одна ошибка — отклоняем весь импорт
      let created = 0
      for (const input of valid) {
        const k = key(input)
        if (existing.has(k)) continue
        existing.add(k)
        data.transactions.push({ ...input, id: `t${++seq}`, createdAt: now().toISOString() })
        created += 1
      }
      if (created) changed()
      return { created, skipped: valid.length - created }
    },

    summary(month) {
      const current = totalsFor(month)
      const prev = totalsFor(shiftMonth(month, -1))
      return {
        month,
        income: current.income,
        expense: current.expense,
        byCategory: [...current.byCategory]
          .map(([categoryId, amount]) => ({ categoryId, amount }))
          .sort((a, b) => b.amount - a.amount),
        previous: { income: prev.income, expense: prev.expense },
      }
    },

    cashflow(months, end) {
      return lastMonths(months, end ?? monthOf(toISODate(now()))).map((month) => {
        const { income, expense } = totalsFor(month)
        return { month, income, expense }
      })
    },

    budgets(month) {
      const { byCategory } = totalsFor(month)
      return data.budgets.map((b) => ({ ...b, month, spent: byCategory.get(b.categoryId) ?? 0 }))
    },

    setBudget(categoryId, limit) {
      const category = data.categories.find((c) => c.id === categoryId)
      if (!category || category.kind !== 'expense') throw new ValidationError({ categoryId: 'Лимит ставится на категорию расходов' })
      if (!Number.isSafeInteger(limit) || (limit as number) <= 0) throw new ValidationError({ limit: 'Лимит должен быть больше нуля' })
      const existing = data.budgets.find((b) => b.categoryId === categoryId)
      if (existing) existing.limit = limit as number
      else data.budgets.push({ categoryId, limit: limit as number })
      changed()
      const month = monthOf(toISODate(now()))
      return db.budgets(month).find((b) => b.categoryId === categoryId)!
    },

    deleteBudget(categoryId) {
      data.budgets = data.budgets.filter((b) => b.categoryId !== categoryId)
      changed()
    },
  }
  return db
}
