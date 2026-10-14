/**
 * Деньги — целые копейки.
 *
 * Почему не рубли дробным числом: в JavaScript `0.1 + 0.2 === 0.30000000000000004`.
 * Числа с плавающей точкой хранят десятичные дроби неточно, и на сотнях операций
 * копейки «уплывают»: итог не сходится с суммой строк. Целые числа складываются
 * точно (до 2^53 ≈ 9 × 10^15 копеек — хватит). Поэтому:
 *   - в состоянии, в API и в расчётах — только копейки (`12350`);
 *   - в рубли превращаем в последний момент, при показе (`formatMoney`);
 *   - из строки пользователя — сразу в копейки (`parseMoney`).
 */

const formatters = new Map<string, Intl.NumberFormat>()

/** Intl.NumberFormat создаётся дорого — кешируем по набору опций. */
function formatter(options: Intl.NumberFormatOptions) {
  const key = JSON.stringify(options)
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('ru-RU', options)
    formatters.set(key, f)
  }
  return f
}

export interface FormatMoneyOptions {
  /** Показывать «+» у положительных (для доходов в списке). */
  sign?: boolean
  /** Без копеек, если они нулевые: «1 200 ₽» вместо «1 200,00 ₽». */
  trim?: boolean
  /** Кратко для осей графиков: «12,3 тыс. ₽». */
  compact?: boolean
  /** Без знака валюты. */
  bare?: boolean
}

export function formatMoney(kopecks: number, options: FormatMoneyOptions = {}): string {
  const rubles = kopecks / 100
  const fraction = options.compact || (options.trim && kopecks % 100 === 0) ? 0 : 2
  const text = formatter({
    style: options.bare ? 'decimal' : 'currency',
    currency: 'RUB',
    notation: options.compact ? 'compact' : 'standard',
    minimumFractionDigits: options.compact ? 0 : fraction,
    maximumFractionDigits: options.compact ? 1 : fraction,
    signDisplay: options.sign ? 'exceptZero' : 'auto',
  }).format(rubles)
  // Intl ставит неразрывный пробел (U+00A0) между разрядами и перед ₽ — оставляем:
  // сумма не разорвётся переносом строки. Минус — настоящий «−», а не дефис.
  return text.replace('-', '−')
}

/**
 * Строка пользователя → копейки. null — если это не сумма.
 * Понимает: «1234», «1 234,5», «1234.50», «−200», «1 200 ₽», «2,000.00» (выписки банков).
 */
export function parseMoney(input: string): number | null {
  let s = input
    .trim()
    .replace(/[\s  ₽]|руб\.?|RUB/gi, '')
    .replace('−', '-')
  if (!s) return null
  // «2,000.00» — запятая разделяет тысячи, точка — копейки (английский формат выписок).
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  s = s.replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  // Через строку, а не `Number(s) * 100`: 1.15 * 100 = 114.99999999999999.
  const negative = s.startsWith('-')
  const [whole = '0', frac = ''] = s.replace('-', '').split('.')
  const kopecks = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  if (!Number.isSafeInteger(kopecks)) return null
  return negative ? -kopecks : kopecks
}

/** Доля 0…1 → «12 %». */
export function formatPercent(share: number, digits = 0): string {
  return formatter({ style: 'percent', maximumFractionDigits: digits }).format(share)
}

/** Изменение к прошлому периоду: 1200 → 1500 = +0.25. null — если сравнивать не с чем. */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / previous
}

/** Короткая подпись для осей графиков: 12 000 000 коп. → «120к», 150 000 000 → «1,5 млн». */
export function formatAxis(kopecks: number): string {
  const rubles = Math.abs(kopecks) / 100
  const sign = kopecks < 0 ? '−' : ''
  if (rubles >= 1_000_000) return `${sign}${(rubles / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} млн`
  if (rubles >= 1000) return `${sign}${Math.round(rubles / 1000)}к`
  return `${sign}${Math.round(rubles)}`
}
