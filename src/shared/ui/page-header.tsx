import type { ReactNode } from 'react'

import s from './page-header.module.scss'

/** Заголовок страницы + <title> вкладки (React 19 сам поднимает <title> в <head>). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={s.header}>
      <title>{`${title} — Сальдо`}</title>
      <div>
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  )
}
