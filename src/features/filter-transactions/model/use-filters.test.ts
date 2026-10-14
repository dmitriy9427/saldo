import { describe, expect, it } from 'vitest'

import { parseFilters, toQuery } from './use-filters'

describe('фильтры из адреса', () => {
  it('мусор в адресе не ломает страницу', () => {
    const f = parseFilters(new URLSearchParams('period=decade&type=gift&page=-3&month=2026-13x'))
    expect(f).toMatchObject({ period: 'month', type: undefined, page: 1 })
    expect(f.month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('месяц → границы дат, фильтры → запрос', () => {
    const f = parseFilters(new URLSearchParams('month=2026-02&type=expense&category=cafe&q=+кофе+&sort=amount&dir=asc&page=2'))
    expect(toQuery(f)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      type: 'expense',
      accountId: undefined,
      categoryId: 'cafe',
      q: 'кофе',
      sort: 'amount',
      dir: 'asc',
      page: 2,
      pageSize: 30,
    })
  })

  it('«всё время» — без границ дат', () => {
    const q = toQuery(parseFilters(new URLSearchParams('period=all')))
    expect(q.from).toBeUndefined()
    expect(q.to).toBeUndefined()
  })
})
