/**
 * Демо-данные: три счёта, категории и ~13 месяцев операций до «сегодня».
 *
 * Генератор с зерном (rng.ts): данные одинаковые при каждом запуске, но
 * «живые» — зарплата дважды в месяц, аренда 5-го числа, продукты через день,
 * кафе чаще по выходным, отпуск летом, подарки в декабре.
 */
import type { Account, Budget, Category, ISODate, Transaction } from '../api/types'
import { toISODate } from '../lib/date'
import { createRng } from './rng'

export interface Dataset {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
}

export const CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Продукты', kind: 'expense', color: '#22a06b', icon: 'shopping-cart' },
  { id: 'cafe', name: 'Кафе и рестораны', kind: 'expense', color: '#f5793a', icon: 'coffee' },
  { id: 'transport', name: 'Транспорт', kind: 'expense', color: '#3b82f6', icon: 'bus' },
  { id: 'home', name: 'Жильё', kind: 'expense', color: '#8b5cf6', icon: 'house' },
  { id: 'utilities', name: 'Связь и интернет', kind: 'expense', color: '#06b6d4', icon: 'wifi' },
  { id: 'subscriptions', name: 'Подписки', kind: 'expense', color: '#ec4899', icon: 'tv' },
  { id: 'health', name: 'Здоровье', kind: 'expense', color: '#ef4444', icon: 'heart-pulse' },
  { id: 'clothes', name: 'Одежда', kind: 'expense', color: '#a16207', icon: 'shirt' },
  { id: 'fun', name: 'Развлечения', kind: 'expense', color: '#eab308', icon: 'ticket' },
  { id: 'travel', name: 'Путешествия', kind: 'expense', color: '#0ea5e9', icon: 'plane' },
  { id: 'gifts', name: 'Подарки', kind: 'expense', color: '#d946ef', icon: 'gift' },
  { id: 'education', name: 'Образование', kind: 'expense', color: '#64748b', icon: 'graduation-cap' },
  { id: 'salary', name: 'Зарплата', kind: 'income', color: '#16a34a', icon: 'briefcase' },
  { id: 'freelance', name: 'Подработка', kind: 'income', color: '#0d9488', icon: 'laptop' },
  { id: 'cashback', name: 'Кешбэк и проценты', kind: 'income', color: '#65a30d', icon: 'percent' },
]

const ACCOUNTS: Omit<Account, 'balance'>[] = [
  { id: 'card', name: 'Основная карта', kind: 'card', color: '#6366f1', initialBalance: 4_250_000 },
  { id: 'cash', name: 'Наличные', kind: 'cash', color: '#f59e0b', initialBalance: 800_000 },
  { id: 'savings', name: 'Накопительный счёт', kind: 'savings', color: '#10b981', initialBalance: 12_000_000 },
]

export const BUDGETS: Budget[] = [
  { categoryId: 'groceries', limit: 2_800_000 },
  { categoryId: 'cafe', limit: 900_000 },
  { categoryId: 'transport', limit: 450_000 },
  { categoryId: 'fun', limit: 600_000 },
  { categoryId: 'clothes', limit: 700_000 },
  { categoryId: 'subscriptions', limit: 150_000 },
]

/** Заметки для правдоподобия: по ним работает поиск. */
const NOTES: Record<string, string[]> = {
  groceries: ['Пятёрочка', 'ВкусВилл', 'Перекрёсток', 'Рынок', 'Магнит у дома', 'Лавка'],
  cafe: ['Кофе с собой', 'Обед у работы', 'Шоколадница', 'Пицца', 'Суши с друзьями', 'Бургерная'],
  transport: ['Метро', 'Такси', 'Каршеринг', 'Электричка'],
  health: ['Аптека', 'Стоматолог', 'Анализы'],
  clothes: ['Кроссовки', 'Куртка', 'Джинсы', 'Футболки'],
  fun: ['Кино', 'Концерт', 'Боулинг', 'Квиз', 'Театр'],
  gifts: ['Подарок маме', 'День рождения друга', 'Цветы'],
  education: ['Курс по TypeScript', 'Книги', 'Английский'],
  freelance: ['Лендинг для кофейни', 'Правки вёрстки', 'Консультация'],
}

const rub = (n: number) => n * 100

export function createSeed(now = new Date()): Dataset {
  const rng = createRng(20261014)
  const transactions: Transaction[] = []
  let seq = 0

  const add = (t: Omit<Transaction, 'id' | 'createdAt' | 'note' | 'toAccountId'> & { note?: string; toAccountId?: string }) => {
    seq += 1
    const [y, m, d] = t.date.split('-').map(Number) as [number, number, number]
    transactions.push({
      id: `t${seq}`,
      note: '',
      toAccountId: null,
      ...t,
      // Время создания — раннее утро того же дня по местному времени: операции,
      // добавленные пользователем сегодня, окажутся в списке выше демо-данных.
      createdAt: new Date(y, m - 1, d, 6, 0, seq % 3600).toISOString(),
    })
  }
  const expense = (date: ISODate, categoryId: string, amount: number, accountId = 'card') =>
    add({ type: 'expense', date, categoryId, amount, accountId, note: NOTES[categoryId] ? rng.pick(NOTES[categoryId]) : '' })
  const income = (date: ISODate, categoryId: string, amount: number, note = '') =>
    add({ type: 'income', date, categoryId, amount, accountId: categoryId === 'cashback' ? 'savings' : 'card', note })

  const start = new Date(now.getFullYear(), now.getMonth() - 12, 1)
  for (const day = new Date(start); day <= now; day.setDate(day.getDate() + 1)) {
    const date = toISODate(day)
    const d = day.getDate()
    const month = day.getMonth()
    const weekend = day.getDay() === 0 || day.getDay() === 6
    const lastDay = new Date(day.getFullYear(), month + 1, 0).getDate()

    // Доходы: аванс 10-го, зарплата 25-го (с декабрьской премией), проценты в последний день.
    if (d === 10) income(date, 'salary', rub(rng.int(44, 47) * 1000), 'Аванс')
    if (d === 25) income(date, 'salary', rub((month === 11 ? 105 : rng.int(56, 60)) * 1000), month === 11 ? 'Зарплата и премия' : 'Зарплата')
    if (d === lastDay) income(date, 'cashback', rub(rng.int(900, 1600)), 'Проценты на остаток')
    if (rng.chance(0.02)) income(date, 'freelance', rub(rng.int(5, 20) * 1000), rng.pick(NOTES.freelance!))

    // Обязательные: аренда, связь, подписки; на накопительный — после зарплаты.
    if (d === 5) expense(date, 'home', rub(38_000))
    if (d === 7) expense(date, 'utilities', rub(rng.int(650, 900)))
    if (d === 12) expense(date, 'subscriptions', rub(299))
    if (d === 18) expense(date, 'subscriptions', rub(rng.pick([399, 449, 499])))
    if (d === 26) add({ type: 'transfer', date, amount: rub(10_000), accountId: 'card', toAccountId: 'savings', categoryId: null, note: 'Отложить' })
    if (d === 1) add({ type: 'transfer', date, amount: rub(2_000), accountId: 'card', toAccountId: 'cash', categoryId: null, note: 'Снял в банкомате' })

    // Повседневное.
    if (rng.chance(0.55)) expense(date, 'groceries', rub(rng.int(250, weekend ? 4200 : 2200)))
    if (rng.chance(weekend ? 0.6 : 0.35)) expense(date, 'cafe', rub(rng.int(180, weekend ? 3200 : 900)))
    if (!weekend && rng.chance(0.85)) expense(date, 'transport', rub(rng.chance(0.85) ? 63 * 2 : rng.int(350, 900)))
    if (rng.chance(0.04)) expense(date, 'health', rub(rng.int(300, 6000)))
    if (rng.chance(0.03)) expense(date, 'clothes', rub(rng.int(15, 90) * 100))
    if (weekend && rng.chance(0.3)) expense(date, 'fun', rub(rng.int(5, 30) * 100))
    if (rng.chance(0.015)) expense(date, 'education', rub(rng.int(5, 40) * 100))
    // Наличными: кофе и рынок по воскресеньям.
    if (rng.chance(0.08)) expense(date, 'cafe', rub(rng.int(150, 450)), 'cash')
    if (day.getDay() === 0 && rng.chance(0.5)) add({ type: 'expense', date, categoryId: 'groceries', amount: rub(rng.int(400, 900)), accountId: 'cash', note: 'Рынок' })

    // Сезонное: отпуск в июле, подарки в декабре.
    if (month === 6 && d === 8) {
      expense(date, 'travel', rub(46_000))
      expense(date, 'travel', rub(32_500))
    }
    if (month === 11 && d >= 15 && rng.chance(0.4)) expense(date, 'gifts', rub(rng.int(15, 60) * 100))
  }

  // Начальные остатки подобраны так, чтобы к «сегодня» всё было в плюсе.
  const accounts = ACCOUNTS.map((a) => ({ ...a, balance: a.initialBalance }))
  return { accounts, categories: CATEGORIES, transactions, budgets: BUDGETS }
}
