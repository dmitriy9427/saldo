import { describe, expect, it } from 'vitest'

import { changeRatio, formatAxis, formatMoney, parseMoney } from './money'

// Intl ставит неразрывные пробелы — в ожиданиях заменяем их на обычные.
const plain = (s: string) => s.replace(/[  ]/g, ' ')

describe('parseMoney', () => {
  it.each([
    ['1234', 123400],
    ['1 234,5', 123450],
    ['1234.50', 123450],
    ['−200', -20000],
    ['-200,01', -20001],
    ['1 200 ₽', 120000],
    ['2,000.00', 200000], // формат английских выписок
    ['0,1', 10],
    ['1.15', 115], // 1.15 * 100 = 114.99999999999999 — поэтому разбираем строку
  ])('«%s» → %i копеек', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })

  it.each(['', 'abc', '12,3,4', '1e5', '--5'])('«%s» — не сумма', (input) => {
    expect(parseMoney(input)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('рубли с копейками, неразрывные пробелы, настоящий минус', () => {
    expect(plain(formatMoney(123450))).toBe('1 234,50 ₽')
    expect(plain(formatMoney(-500))).toBe('−5,00 ₽')
    expect(formatMoney(100000)).not.toContain(' ') // только неразрывные
  })

  it('trim убирает нулевые копейки, sign добавляет плюс', () => {
    expect(plain(formatMoney(120000, { trim: true }))).toBe('1 200 ₽')
    expect(plain(formatMoney(120050, { trim: true }))).toBe('1 200,50 ₽')
    expect(plain(formatMoney(5000, { sign: true, trim: true }))).toBe('+50 ₽')
  })
})

describe('formatAxis', () => {
  it('коротко для осей', () => {
    expect(formatAxis(12_000_000)).toBe('120к')
    expect(formatAxis(150_000_000)).toBe('1,5 млн')
    expect(formatAxis(100_000_000)).toBe('1 млн')
    expect(formatAxis(50_000)).toBe('500')
  })
})

describe('changeRatio', () => {
  it('доля изменения, null если не с чем сравнить', () => {
    expect(changeRatio(150, 100)).toBe(0.5)
    expect(changeRatio(50, 100)).toBe(-0.5)
    expect(changeRatio(10, 0)).toBeNull()
  })
})
