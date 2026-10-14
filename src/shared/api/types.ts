/**
 * Контракт API — типы того, что ходит по сети между приложением и сервером.
 *
 * Почему в shared, а не в entities: эти типы нужны и приложению (entities),
 * и демо-серверу (shared/mock). По правилам FSD shared не может импортировать
 * из верхних слоёв, а наоборот — можно. Сущности берут отсюда DTO и, если нужно,
 * добавляют свои производные типы.
 *
 * Деньги — ВСЕГДА целые копейки (`amount: 12350` = 123,50 ₽). Почему —
 * shared/lib/money.ts.
 */

export type ID = string

/** Дата без времени: '2026-10-14'. Строкой — чтобы не было сдвигов из-за часовых поясов. */
export type ISODate = string

/** Месяц: '2026-10'. */
export type MonthKey = string

export type TransactionType = 'expense' | 'income' | 'transfer'
export type CategoryKind = 'expense' | 'income'
export type AccountKind = 'card' | 'cash' | 'savings'

export interface Account {
  id: ID
  name: string
  kind: AccountKind
  color: string
  /** Остаток на начало учёта, копейки. */
  initialBalance: number
  /** Текущий остаток (сервер считает: начальный + доходы − расходы ± переводы), копейки. */
  balance: number
}

export interface Category {
  id: ID
  name: string
  kind: CategoryKind
  color: string
  /** Имя иконки (lucide), см. entities/category/ui/category-icon.tsx. */
  icon: string
}

export interface Transaction {
  id: ID
  type: TransactionType
  date: ISODate
  /** Сумма, копейки, всегда > 0. Знак задаёт type. */
  amount: number
  accountId: ID
  /** Только для перевода: счёт-получатель. */
  toAccountId: ID | null
  /** Для перевода — null. */
  categoryId: ID | null
  note: string
  /** Когда создана — для сортировки внутри одного дня. */
  createdAt: string
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>

export type SortField = 'date' | 'amount'
export type SortDir = 'asc' | 'desc'

export interface TransactionQuery {
  from?: ISODate
  to?: ISODate
  type?: TransactionType
  accountId?: ID
  categoryId?: ID
  /** Поиск по заметке и названию категории. */
  q?: string
  sort?: SortField
  dir?: SortDir
  page?: number
  pageSize?: number
}

export interface TransactionPage {
  items: Transaction[]
  total: number
  page: number
  pageSize: number
  /** Суммы по ВСЕЙ выборке (а не по странице) — для строки «Итого». */
  totals: { income: number; expense: number }
}

export interface BulkResult {
  created: number
  /** Сколько пропущено как дубликаты (та же дата, сумма, счёт и заметка). */
  skipped: number
}

export interface MonthSummary {
  month: MonthKey
  income: number
  expense: number
  /** Расходы по категориям, по убыванию. */
  byCategory: { categoryId: ID; amount: number }[]
  /** Те же цифры за прошлый месяц — для «+12% к сентябрю». */
  previous: { income: number; expense: number }
}

export interface CashflowPoint {
  month: MonthKey
  income: number
  expense: number
}

export interface Budget {
  categoryId: ID
  /** Лимит в месяц, копейки. */
  limit: number
}

export interface BudgetStatus extends Budget {
  month: MonthKey
  /** Потрачено в этом месяце, копейки. */
  spent: number
}

export interface ApiError {
  message: string
  /** Ошибки по полям формы: { amount: 'Больше нуля' }. */
  fields?: Record<string, string>
}
