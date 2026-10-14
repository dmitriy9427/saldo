/**
 * Разбор банковской выписки (CSV) — чистые функции, без React и Redux.
 * Поэтому их легко тестировать (parse.test.ts): вход — текст, выход — строки.
 *
 * Выписки у банков разные: разделитель «;» или «,», дата «14.10.2026» или
 * «2026-10-14 12:30», сумма «-1 250,50» или «-1250.50», кодировка UTF-8 или
 * Windows-1251. Мы угадываем, что можем, а остальное пользователь поправит
 * на шаге «Колонки».
 */
import Papa from 'papaparse'

import type { ID, ISODate } from '@/shared/api'
import { parseMoney } from '@/shared/lib'

export type Role = 'date' | 'amount' | 'description'
export type Mapping = Record<Role, number | null>

export interface ImportRow {
  /** Номер строки в файле (с 1) — для сообщений «строка 14: неверная дата». */
  line: number
  date: ISODate | null
  /** Копейки со знаком: < 0 — расход. */
  amount: number | null
  description: string
  categoryId: ID | null
  error: string | null
}

/** Текст файла с угадыванием кодировки: UTF-8, а если не похоже — Windows-1251. */
export function decode(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  // U+FFFD — «символ-заменитель»: байты не сложились в UTF-8. Значит, это 1251.
  if (!utf8.includes('�')) return utf8.replace(/^﻿/, '')
  return new TextDecoder('windows-1251').decode(buffer)
}

export function parseCsv(text: string): string[][] {
  // Papa сам угадывает разделитель (; , табуляция) и понимает кавычки:
  // «"ООО ""Ромашка"", Москва"» — одна ячейка, а не три.
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy' })
  return result.data.map((row) => row.map((cell) => cell.trim()))
}

const HEADER_HINTS: Record<Role, RegExp> = {
  date: /дата|date/i,
  amount: /сумм|amount|итог/i,
  description: /описан|назначен|контрагент|получател|магазин|description|merchant|payee|details/i,
}

/** Первая строка — заголовки? Да, если в ней нет ни одной даты и суммы. */
export function looksLikeHeader(row: string[] | undefined): boolean {
  return Boolean(row?.length && !row.some((cell) => parseDate(cell) || parseMoney(cell) !== null))
}

/**
 * Какая колонка за что отвечает. Сначала по заголовкам, а если их нет —
 * по содержимому: где даты, где суммы, а описание — самая «текстовая» колонка.
 */
export function detectMapping(table: string[][], hasHeader: boolean): Mapping {
  const mapping: Mapping = { date: null, amount: null, description: null }
  const header = hasHeader ? table[0] : undefined
  const sample = table.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 20)
  const width = Math.max(0, ...table.map((r) => r.length))

  if (header) {
    for (const role of Object.keys(HEADER_HINTS) as Role[]) {
      // Сумма: «Сумма операции» лучше, чем «Сумма в валюте счёта» — берём первую подходящую.
      const index = header.findIndex((cell, i) => HEADER_HINTS[role].test(cell) && !Object.values(mapping).includes(i))
      if (index >= 0) mapping[role] = index
    }
  }

  const share = (i: number, test: (cell: string) => boolean) =>
    sample.filter((row) => row[i] !== undefined && test(row[i]!)).length / Math.max(1, sample.length)
  const free = (i: number) => !Object.values(mapping).includes(i)
  const columns = Array.from({ length: width }, (_, i) => i)

  mapping.date ??= columns.find((i) => free(i) && share(i, (c) => parseDate(c) !== null) > 0.8) ?? null
  mapping.amount ??= columns.find((i) => free(i) && share(i, (c) => parseMoney(c) !== null) > 0.8) ?? null
  if (mapping.description === null) {
    const avgLength = (i: number) => sample.reduce((sum, row) => sum + (row[i]?.length ?? 0), 0) / Math.max(1, sample.length)
    mapping.description = columns.filter(free).sort((a, b) => avgLength(b) - avgLength(a))[0] ?? null
  }
  return mapping
}

/** «14.10.2026», «14/10/2026», «2026-10-14», «14.10.2026 12:30:00» → '2026-10-14'. */
export function parseDate(input: string): ISODate | null {
  const s = input.trim()
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(s)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else {
    match = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})(?:\s.*)?$/.exec(s)
    if (!match) return null
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (y < 100) y += 2000
  }
  // Проверка, что такой день есть: 31.02 → Date «перескочит» на 3 марта.
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Категория по описанию: «ПЯТЕРОЧКА 1234 МОСКВА» → Продукты. Простые правила
 * по ключевым словам; не угадали — пользователь выберет на шаге проверки.
 */
const RULES: [RegExp, ID][] = [
  [/пят[её]рочк|перекр[её]ст|магнит|вкусвилл|лавка|ашан|лента|дикси|продукт|grocery/i, 'groceries'],
  [/кофе|cafe|кафе|ресторан|пицц|суши|бургер|шоколадниц|coffee|restaurant/i, 'cafe'],
  [/метро|такси|taxi|транспорт|каршеринг|электрич|тройка/i, 'transport'],
  [/аптек|клиник|стоматолог|анализ|pharma/i, 'health'],
  [/кино|театр|концерт|билет|cinema/i, 'fun'],
  [/подписк|music|музык|кинопоиск|netflix|spotify/i, 'subscriptions'],
  [/интернет|связь|мобильн|телеком/i, 'utilities'],
  [/аренд|квартплат|жкх|коммунал/i, 'home'],
  [/одежд|обув|кроссовк/i, 'clothes'],
  [/зарплат|аванс|salary/i, 'salary'],
  [/кешб[еэ]к|cashback|процент/i, 'cashback'],
]

export function guessCategory(description: string, amount: number | null): ID | null {
  const rule = RULES.find(([pattern]) => pattern.test(description))
  if (rule) return rule[1]
  return amount !== null && amount > 0 ? 'freelance' : null
}

/** Таблица + разметка колонок → строки для импорта. Ошибки — по строкам, не исключением. */
export function buildRows(table: string[][], mapping: Mapping, hasHeader: boolean): ImportRow[] {
  const start = hasHeader ? 1 : 0
  return table.slice(start).map((cells, i) => {
    const line = i + start + 1
    const rawDate = mapping.date === null ? '' : (cells[mapping.date] ?? '')
    const rawAmount = mapping.amount === null ? '' : (cells[mapping.amount] ?? '')
    const description = mapping.description === null ? '' : (cells[mapping.description] ?? '')
    const date = parseDate(rawDate)
    const amount = parseMoney(rawAmount)
    const error = !date
      ? `Не понял дату «${rawDate || 'пусто'}»`
      : amount === null
        ? `Не понял сумму «${rawAmount || 'пусто'}»`
        : amount === 0
          ? 'Нулевая сумма'
          : null
    return { line, date, amount, description, categoryId: guessCategory(description, amount), error }
  })
}
