import type { CSSProperties } from 'react'

import { cx } from '../lib/cx'
import s from './segmented.module.scss'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
  size?: 'sm' | 'md'
}

/**
 * Переключатель из нескольких вариантов («Расход / Доход / Перевод»).
 * Это группа радиокнопок: стрелки ← → переключают, Tab заходит один раз.
 */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: SegmentedProps<T>) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(s.root, s[size])}
      style={{ '--count': options.length, '--index': index } as CSSProperties}
      onKeyDown={(event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
        if (!step) return
        event.preventDefault()
        const next = options[(index + step + options.length) % options.length]!
        onChange(next.value)
        // Фокус — за выбранным вариантом (у остальных tabIndex = -1).
        requestAnimationFrame(() =>
          event.currentTarget.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
        )
      }}
    >
      <span className={s.thumb} aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          className={s.option}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
