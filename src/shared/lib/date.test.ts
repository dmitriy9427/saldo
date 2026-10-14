import { describe, expect, it } from 'vitest'

import { formatMonth, lastMonths, monthRange, shiftMonth, toISODate } from './date'

describe('даты', () => {
  it('toISODate — местная дата, а не UTC', () => {
    // 00:30 1 октября по местному времени: в UTC (для UTC+3) это ещё 30 сентября.
    expect(toISODate(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01')
  })

  it('monthRange знает длину месяца и високосный февраль', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(monthRange('2028-02').to).toBe('2028-02-29')
    expect(monthRange('2026-02').to).toBe('2026-02-28')
  })

  it('shiftMonth и lastMonths переходят через год', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(lastMonths(3, '2026-02')).toEqual(['2025-12', '2026-01', '2026-02'])
  })

  it('месяц в нужном падеже', () => {
    expect(formatMonth('2026-10')).toBe('Октябрь 2026')
    expect(formatMonth('2026-09', 'genitive')).toBe('сентября')
    expect(formatMonth('2026-09', 'dative')).toBe('сентябрю')
    expect(formatMonth('2026-05', 'dative')).toBe('маю')
    expect(formatMonth('2026-03', 'dative')).toBe('марту')
  })
})
