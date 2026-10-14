import { FileUp, LayoutDashboard, List, Plus, Target, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { ResetDemoButton } from '@/features/reset-demo'
import { ThemeToggle, useApplyTheme } from '@/features/toggle-theme'
import { TransactionFormModal, formOpened } from '@/features/transaction-form'
import { cx } from '@/shared/lib'
import { useAppDispatch } from '@/shared/model'
import { Button, Toaster } from '@/shared/ui'

import s from './app-shell.module.scss'

const NAV = [
  { to: '/', label: 'Обзор', Icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Операции', Icon: List },
  { to: '/budgets', label: 'Бюджеты', Icon: Target },
  { to: '/accounts', label: 'Счета', Icon: Wallet },
  { to: '/import', label: 'Импорт', Icon: FileUp },
]

/** Каркас: меню слева (на телефоне — вкладки снизу), страница, общая форма операции и тосты. */
export function AppShell() {
  const dispatch = useAppDispatch()
  const { pathname } = useLocation()
  useApplyTheme()

  // Клавиша N — новая операция (если фокус не в поле ввода и не открыто окно).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // «т» — та же клавиша в русской раскладке.
      if (event.key.toLowerCase() !== 'n' && event.key.toLowerCase() !== 'т') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable], dialog')) return
      event.preventDefault()
      dispatch(formOpened())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  // Новая страница — наверх (у SPA прокрутка сама не сбрасывается).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        К содержимому
      </a>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden>
            С
          </span>
          Сальдо
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => dispatch(formOpened())} className={s.add}>
          Операция
          <kbd className={s.kbd}>N</kbd>
        </Button>
        <nav aria-label="Разделы" className={s.nav}>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(s.link, isActive && s.active)}>
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={s.bottom}>
          <ThemeToggle />
          <ResetDemoButton />
          <p className={s.note}>Демо: данные хранятся в этом браузере, сервер — Mock Service Worker.</p>
        </div>
      </aside>

      <header className={s.mobileHeader}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden>
            С
          </span>
          Сальдо
        </div>
        <NavLink to="/import" className={s.iconLink} aria-label="Импорт выписки">
          <FileUp />
        </NavLink>
        <ThemeToggle />
      </header>

      <main id="main" className={s.main}>
        <Outlet />
      </main>

      <nav aria-label="Разделы" className={s.tabbar}>
        {NAV.slice(0, 2).map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(s.tab, isActive && s.active)}>
            <Icon aria-hidden />
            {label}
          </NavLink>
        ))}
        <button type="button" className={s.fab} onClick={() => dispatch(formOpened())} aria-label="Новая операция">
          <Plus />
        </button>
        {NAV.slice(2, 4).map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cx(s.tab, isActive && s.active)}>
            <Icon aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <TransactionFormModal />
      <Toaster />
    </div>
  )
}
