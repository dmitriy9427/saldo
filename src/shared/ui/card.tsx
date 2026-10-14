import type { ComponentProps, ReactNode } from 'react'

import { cx } from '../lib/cx'
import s from './card.module.scss'

interface CardProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: ReactNode
  /** Справа от заголовка: ссылка «Все», переключатель периода. */
  action?: ReactNode
}

export function Card({ title, action, className, children, ...props }: CardProps) {
  return (
    <section className={cx(s.card, className)} {...props}>
      {(title || action) && (
        <header className={s.header}>
          {title && <h2 className={s.title}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
