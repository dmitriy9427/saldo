import { type ComponentProps, type ReactNode, useId } from 'react'

import { cx } from '../lib/cx'
import s from './field.module.scss'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  /** Получает id и aria-атрибуты для поля — связь подписи и ошибки со скринридером. */
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Подпись + поле + ошибка. Ошибка связана с полем через aria-describedby — скринридер её прочитает. */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? messageId : undefined })}
      {error ? (
        <p id={messageId} className={s.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className={s.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(s.control, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cx(s.control, s.select, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cx(s.control, s.textarea, className)} {...props} />
}
