/**
 * Маршруты (React Router 8, data mode).
 *
 * Страницы грузятся лениво (lazy): код графиков (Recharts — самая тяжёлая
 * зависимость) скачивается, только когда открыли страницу с графиками.
 * basename — подпапка на GitHub Pages (/saldo/).
 */
import { createBrowserRouter } from 'react-router'

import { AppShell } from '@/widgets/app-shell'

import { RouteError, RouteFallback } from './route-error'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: AppShell,
      ErrorBoundary: RouteError,
      HydrateFallback: RouteFallback,
      children: [
        { index: true, lazy: async () => ({ Component: (await import('@/pages/dashboard')).DashboardPage }) },
        { path: 'transactions', lazy: async () => ({ Component: (await import('@/pages/transactions')).TransactionsPage }) },
        { path: 'budgets', lazy: async () => ({ Component: (await import('@/pages/budgets')).BudgetsPage }) },
        { path: 'accounts', lazy: async () => ({ Component: (await import('@/pages/accounts')).AccountsPage }) },
        { path: 'import', lazy: async () => ({ Component: (await import('@/pages/import')).ImportPage }) },
        { path: '*', lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
