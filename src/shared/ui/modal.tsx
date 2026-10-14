import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'

import s from './modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Кнопки внизу. */
  footer?: ReactNode
}

/**
 * Модальное окно на нативном <dialog>.
 *
 * showModal() даёт бесплатно то, что раньше писали руками: фокус внутрь окна,
 * Tab не уходит на страницу под ним (она становится inert), Esc закрывает,
 * при закрытии фокус возвращается на кнопку, которая окно открыла, окно —
 * в верхнем слое (top layer), поверх любых z-index.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() ставит фокус на первый фокусируемый элемент — крестик в шапке.
      // Поле, которое должно получить фокус, помечаем data-autofocus (autoFocus
      // из React тут не поможет: он срабатывает раньше showModal и перебивается).
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      // Esc и dialog.close() — событие close. Синхронизируем с состоянием React.
      onClose={onClose}
      // Клик по подложке: цель — сам <dialog> (содержимое лежит во внутреннем div).
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {open && (
        <div className={s.box}>
          <header className={s.header}>
            <h2 id={titleId} className={s.title}>
              {title}
            </h2>
            <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
              <X />
            </button>
          </header>
          <div className={s.body}>{children}</div>
          {footer && <footer className={s.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
