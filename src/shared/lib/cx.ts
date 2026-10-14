/** Склеить классы, пропуская пустые: cx('a', cond && 'b') → 'a b'. */
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ')
