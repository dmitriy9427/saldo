/**
 * Темп трат по бюджету. «Потрачено 60 %» само по себе ничего не говорит:
 * 60 % к 25-му числу — отлично, а к 5-му — тревога. Сравниваем долю
 * потраченного с долей прошедшего месяца и прогнозируем итог.
 */
export type BudgetState = 'ok' | 'warning' | 'over'

export interface BudgetPace {
  /** Доля лимита, 0…∞ (1.2 = перерасход 20 %). */
  used: number
  /** Доля прошедшего месяца, 0…1. */
  elapsed: number
  /** Прогноз трат к концу месяца при текущем темпе, копейки. */
  forecast: number
  /** Сколько осталось (может быть < 0), копейки. */
  left: number
  /** Сколько можно тратить в день до конца месяца, копейки. */
  perDay: number
  state: BudgetState
}

/**
 * @param day Номер текущего дня (1…31). Для прошлых месяцев — последний день.
 * @param daysInMonth Сколько дней в месяце.
 */
export function budgetPace(spent: number, limit: number, day: number, daysInMonth: number): BudgetPace {
  const used = limit > 0 ? spent / limit : 0
  const elapsed = Math.min(1, day / daysInMonth)
  const forecast = elapsed > 0 ? Math.round(spent / elapsed / 100) * 100 : spent
  const left = limit - spent
  const daysLeft = daysInMonth - day + 1
  // До целых рублей вниз: «можно 134 ₽ в день», а не «134,88 ₽».
  const perDay = left > 0 ? Math.floor(left / daysLeft / 100) * 100 : 0
  // warning — тратим быстрее, чем идёт месяц, и прогноз выше лимита.
  const state: BudgetState = spent > limit ? 'over' : forecast > limit && used > 0.5 ? 'warning' : 'ok'
  return { used, elapsed, forecast, left, perDay, state }
}
