import { describe, expect, it } from 'vitest'

import { budgetPace } from './pace'

describe('budgetPace', () => {
  it('половина лимита к середине месяца — в норме, считает «можно в день»', () => {
    const pace = budgetPace(500_000, 1_000_000, 15, 30)
    expect(pace.state).toBe('ok')
    expect(pace.forecast).toBe(1_000_000)
    // Осталось 5000 ₽ на 16 дней = 312,5 ₽ → до целых рублей вниз.
    expect(pace.perDay).toBe(31_200)
  })

  it('быстрее месяца и прогноз выше лимита — предупреждение', () => {
    expect(budgetPace(700_000, 1_000_000, 10, 30).state).toBe('warning')
  })

  it('мелкие траты в начале месяца не пугают (меньше половины лимита)', () => {
    expect(budgetPace(200_000, 1_000_000, 3, 30).state).toBe('ok')
  })

  it('потрачено больше лимита — перерасход, «в день» = 0', () => {
    const pace = budgetPace(1_200_000, 1_000_000, 20, 30)
    expect(pace.state).toBe('over')
    expect(pace.left).toBe(-200_000)
    expect(pace.perDay).toBe(0)
  })
})
