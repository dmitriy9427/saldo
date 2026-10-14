/**
 * Redux store. Что где живёт:
 *   api       — СЕРВЕРНОЕ состояние: кеш RTK Query (операции, счета, отчёты);
 *   toasts    — уведомления (shared/model/toast);
 *   theme     — тема оформления (features/toggle-theme), сохраняется в localStorage;
 *   import    — черновик импорта выписки (features/import-statement).
 * Фильтры списка операций — НЕ в Redux, а в адресе (?type=expense&page=2):
 * ссылкой можно поделиться, «Назад» возвращает прошлый фильтр.
 */
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { importSlice } from '@/features/import-statement'
import { transactionFormSlice } from '@/features/transaction-form'
import { themeSlice } from '@/features/toggle-theme'
import { baseApi } from '@/shared/api'
import { listenerMiddleware, toastSlice } from '@/shared/model'

// combineSlices сам берёт имя ключа из slice.name / api.reducerPath.
const rootReducer = combineSlices(baseApi, toastSlice, themeSlice, importSlice, transactionFormSlice)

export function makeStore(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault()
        // Listener — первым: реакции видят экшен до остальных middleware.
        .prepend(listenerMiddleware.middleware)
        // Middleware RTK Query: кеш, подписки, перезапросы, инвалидация тегов.
        .concat(baseApi.middleware),
  })
  // refetchOnFocus / refetchOnReconnect: слушать focus и online окна.
  setupListeners(store.dispatch)
  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootStateType = ReturnType<typeof rootReducer>
