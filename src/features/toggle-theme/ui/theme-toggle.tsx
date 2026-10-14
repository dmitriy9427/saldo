import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/shared/model'

import { type ThemeMode, selectThemeMode, themeChanged } from '../model/theme-slice'
import s from './theme-toggle.module.scss'

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая', Icon: Sun },
  { value: 'system', label: 'Как в системе', Icon: Monitor },
  { value: 'dark', label: 'Тёмная', Icon: Moon },
]

export function ThemeToggle() {
  const mode = useAppSelector(selectThemeMode)
  const dispatch = useAppDispatch()
  return (
    <div className={s.root} role="radiogroup" aria-label="Тема оформления">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          className={s.option}
          onClick={() => dispatch(themeChanged(value))}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}

/** Применить тему к <html data-theme>. «system» — атрибута нет, работает prefers-color-scheme. */
export function useApplyTheme() {
  const mode = useAppSelector(selectThemeMode)
  useEffect(() => {
    if (mode === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = mode
  }, [mode])
}
