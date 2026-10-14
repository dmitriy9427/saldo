import { type FormatMoneyOptions, formatMoney } from '../lib/money'
import { cx } from '../lib/cx'
import s from './money.module.scss'

interface MoneyProps extends FormatMoneyOptions {
  value: number
  /** Цвет по смыслу: доход зелёный, расход обычный (красный — только для перерасхода). */
  tone?: 'income' | 'expense' | 'muted' | 'auto'
  className?: string
}

/** Сумма: моноширинные цифры (столбцы выравниваются), знак и цвет по смыслу. */
export function Money({ value, tone, className, ...options }: MoneyProps) {
  const resolved = tone === 'auto' ? (value > 0 ? 'income' : value < 0 ? 'expense' : undefined) : tone
  return <span className={cx(s.money, resolved && s[resolved], className)}>{formatMoney(value, options)}</span>
}
