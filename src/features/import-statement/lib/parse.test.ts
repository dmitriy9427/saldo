import { describe, expect, it } from 'vitest'

import { buildRows, decode, detectMapping, guessCategory, looksLikeHeader, parseCsv, parseDate } from './parse'
import { makeSampleCsv } from './sample'

describe('разбор выписки', () => {
  it('кодировка: UTF-8 как есть, Windows-1251 распознаётся', () => {
    const utf8 = new TextEncoder().encode('Дата;Сумма').buffer
    expect(decode(utf8)).toBe('Дата;Сумма')
    // «Дата» в Windows-1251: Д=0xC4 а=0xE0 т=0xF2 а=0xE0.
    const cp1251 = new Uint8Array([0xc4, 0xe0, 0xf2, 0xe0]).buffer
    expect(decode(cp1251)).toBe('Дата')
  })

  it('CSV: разделитель угадывается, кавычки понимаются', () => {
    expect(parseCsv('a;b\n1;"x; y"')).toEqual([
      ['a', 'b'],
      ['1', 'x; y'],
    ])
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it.each([
    ['14.10.2026', '2026-10-14'],
    ['14/10/2026', '2026-10-14'],
    ['2026-10-14', '2026-10-14'],
    ['14.10.2026 12:30:00', '2026-10-14'],
    ['1.2.26', '2026-02-01'],
    ['31.02.2026', null], // такого дня нет
    ['вчера', null],
  ])('дата «%s» → %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })

  it('колонки угадываются по заголовкам', () => {
    const table = parseCsv(makeSampleCsv(new Date(2026, 9, 14)))
    expect(looksLikeHeader(table[0])).toBe(true)
    expect(detectMapping(table, true)).toEqual({ date: 0, amount: 2, description: 4 })
  })

  it('…и по содержимому, если заголовков нет', () => {
    const table = parseCsv('OK;14.10.2026;-100,00;Кофе у метро\nOK;13.10.2026;-250,00;Пятёрочка у дома')
    expect(looksLikeHeader(table[0])).toBe(false)
    expect(detectMapping(table, false)).toEqual({ date: 1, amount: 2, description: 3 })
  })

  it('категория по описанию', () => {
    expect(guessCategory('ПЯТЕРОЧКА 4512 МОСКВА', -48690)).toBe('groceries')
    expect(guessCategory('Такси', -45000)).toBe('transport')
    expect(guessCategory('Непонятный платёж', -3102)).toBeNull()
    expect(guessCategory('Перевод от друга', 100000)).toBe('freelance')
  })

  it('строки с ошибками помечаются, а не роняют разбор', () => {
    const table = parseCsv('Дата;Сумма;Описание\n14.10.2026;-100;Кофе\nвчера;-5;Ошибка\n13.10.2026;abc;Тоже')
    const rows = buildRows(table, { date: 0, amount: 1, description: 2 }, true)
    expect(rows.map((r) => r.error)).toEqual([null, 'Не понял дату «вчера»', 'Не понял сумму «abc»'])
    expect(rows[0]).toMatchObject({ line: 2, date: '2026-10-14', amount: -10000, categoryId: 'cafe' })
  })
})
