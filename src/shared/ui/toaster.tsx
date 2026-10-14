import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cx } from '../lib/cx'
import { type Toast, selectToasts, toastDismissed, useAppDispatch, useAppSelector } from '../model'
import s from './toaster.module.scss'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const [paused, setPaused] = useState(false)
  const left = useRef(toast.duration)

  // Таймер с паузой: навели мышь — время не идёт (успеть нажать «Отменить»).
  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const id = setTimeout(() => dispatch(toastDismissed(toast.id)), left.current)
    return () => {
      clearTimeout(id)
      left.current -= Date.now() - started
    }
  }, [paused, dispatch, toast.id])

  const Icon = ICONS[toast.tone]
  return (
    <li
      className={cx(s.toast, s[toast.tone])}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={s.icon} aria-hidden />
      <span className={s.message}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={s.action}
          onClick={() => {
            dispatch(toast.action!.action)
            dispatch(toastDismissed(toast.id))
          }}
        >
          {toast.action.label}
        </button>
      )}
      <span className={s.timer} style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
    </li>
  )
}

/** Стопка уведомлений внизу экрана. role="status" — скринридер прочитает новое сообщение. */
export function Toaster() {
  const toasts = useAppSelector(selectToasts)
  return (
    <ol className={s.toaster} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  )
}
