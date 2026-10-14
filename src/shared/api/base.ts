/**
 * Один createApi на всё приложение — так советует документация RTK Query.
 *
 * Почему один: у всех запросов общий кеш и общие теги. Создали операцию —
 * мутация говорит «устарели Transaction, Account, Stats, Budget», и RTK Query
 * сам перезапрашивает список, остатки на счетах, графики и бюджеты, которые
 * сейчас на экране. Будь у каждой сущности свой createApi, такой связи не было бы.
 *
 * Эндпоинты здесь пустые: каждая сущность добавляет свои через
 * `baseApi.injectEndpoints` (entities/transaction/api.ts и т. д.). Это и есть
 * FSD: shared ничего не знает о сущностях, сущности расширяют shared.
 */
import { type FetchBaseQueryError, createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { API_URL } from '../config'
import type { ApiError } from './types'

export const TAGS = ['Transaction', 'Account', 'Category', 'Stats', 'Budget'] as const

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: TAGS,
  // Вернулись на вкладку / восстановилась сеть — освежить данные на экране.
  // Работает вместе с setupListeners(store.dispatch) в app/model/store.ts.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  // Данные без подписчиков живут минуту: вернулись на страницу — показали из кеша мгновенно.
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
})

/** Ошибка RTK Query → текст для человека. */
export function errorMessage(error: unknown): string {
  if (!error) return ''
  const e = error as FetchBaseQueryError
  if (e.status === 'FETCH_ERROR') return 'Нет связи с сервером'
  if (e.status === 'PARSING_ERROR') return 'Сервер ответил непонятно'
  if (e.status === 'TIMEOUT_ERROR') return 'Сервер не ответил вовремя'
  if (typeof e.status === 'number') return (e.data as ApiError | undefined)?.message ?? `Ошибка ${e.status}`
  return (error as Error).message ?? 'Что-то пошло не так'
}

/** Ошибки по полям из ответа 422 — для формы (setError). */
export function fieldErrors(error: unknown): Record<string, string> {
  const e = error as FetchBaseQueryError | undefined
  return e && e.status === 422 ? ((e.data as ApiError).fields ?? {}) : {}
}
