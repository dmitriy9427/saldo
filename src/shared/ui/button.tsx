import type { ComponentProps, ReactNode } from 'react'

import { cx } from '../lib/cx'
import s from './button.module.scss'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  /** Идёт запрос: кнопка неактивна, вместо иконки — спиннер. */
  loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(s.button, s[variant], s[size], !children && s.iconOnly, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className={s.spinner} aria-hidden /> : icon}
      {children}
    </button>
  )
}
