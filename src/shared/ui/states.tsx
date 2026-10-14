import { AlertTriangle, Inbox } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { cx } from '../lib/cx'
import { Button } from './button'
import s from './states.module.scss'

/** Серая «болванка» на месте данных, пока они грузятся: размер блока не прыгает. */
export function Skeleton({ width, height = 16, radius, className }: { width?: number | string; height?: number | string; radius?: number; className?: string }) {
  return <span className={cx(s.skeleton, className)} style={{ width, height, borderRadius: radius } as CSSProperties} aria-hidden />
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className={s.state}>
      <span className={s.icon}>{icon ?? <Inbox />}</span>
      <p className={s.title}>{title}</p>
      {text && <p className={s.text}>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry, retrying }: { message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div className={s.state} role="alert">
      <span className={cx(s.icon, s.danger)}>
        <AlertTriangle />
      </span>
      <p className={s.title}>Не удалось загрузить</p>
      <p className={s.text}>{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} loading={retrying}>
          Повторить
        </Button>
      )}
    </div>
  )
}
