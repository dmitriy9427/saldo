/**
 * Операции: список с фильтрами и страницами, одна операция, создание,
 * правка, удаление, импорт пачкой.
 *
 * ─── Теги: как RTK Query понимает, что перезапросить ─────────────────────────
 * Запросы ПРЕДОСТАВЛЯЮТ теги (providesTags), мутации их ИНВАЛИДИРУЮТ
 * (invalidatesTags). Все активные запросы с инвалидированным тегом
 * перезапрашиваются сами.
 *   getTransactions → { Transaction, 'LIST' } + { Transaction, id } на каждую строку;
 *   createTransaction → 'LIST' (новая строка может попасть в любую страницу),
 *     а ещё Account (остатки), Stats (графики), Budget (потрачено);
 *   updateTransaction → { Transaction, id } + то же самое.
 * Код страниц об этом не знает: добавили операцию в модалке — сами
 * обновились список, остатки на счетах, график и бюджеты.
 *
 * ─── Оптимистичное обновление ──────────────────────────────────────────────
 * Правку показываем СРАЗУ, не дожидаясь сервера (onQueryStarted): меняем
 * данные в кеше, а если сервер ответил ошибкой — откатываем (patch.undo()).
 */
import type { TagDescription } from '@reduxjs/toolkit/query'

import {
  type BulkResult,
  type ID,
  type TAGS,
  type Transaction,
  type TransactionInput,
  type TransactionPage,
  type TransactionQuery,
  baseApi,
} from '@/shared/api'

type Tag = TagDescription<(typeof TAGS)[number]>

/** Что устаревает от любого изменения операций: деньги на счетах, отчёты и бюджеты. */
const MONEY_TAGS: Tag[] = [{ type: 'Transaction', id: 'LIST' }, 'Account', 'Stats', 'Budget']

/** Убрать пустые параметры: { q: '', page: 1 } → 'page=1'. Короче адрес — и ключ кеша один для «нет фильтра». */
export function toSearchParams(query: TransactionQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '' && value !== null) params.set(key, String(value))
  }
  return params
}

export const transactionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTransactions: build.query<TransactionPage, TransactionQuery>({
      query: (query) => `transactions?${toSearchParams(query)}`,
      providesTags: (result) => [
        { type: 'Transaction', id: 'LIST' },
        ...(result?.items.map((t) => ({ type: 'Transaction' as const, id: t.id })) ?? []),
      ],
    }),

    getTransaction: build.query<Transaction, ID>({
      query: (id) => `transactions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Transaction', id }],
    }),

    createTransaction: build.mutation<Transaction, TransactionInput>({
      query: (body) => ({ url: 'transactions', method: 'POST', body }),
      invalidatesTags: MONEY_TAGS,
    }),

    updateTransaction: build.mutation<Transaction, { id: ID; patch: Partial<TransactionInput> }>({
      query: ({ id, patch }) => ({ url: `transactions/${id}`, method: 'PATCH', body: patch }),
      // Ошибка проверки (422) — данные не изменились, перезапрашивать нечего.
      invalidatesTags: (_result, error, { id }) => (error ? [] : [{ type: 'Transaction', id }, ...MONEY_TAGS]),
      async onQueryStarted({ id, patch }, { dispatch, getState, queryFulfilled }) {
        // Все закешированные запросы, где есть эта операция: сама операция и страницы списка.
        const patches = transactionApi.util
          .selectInvalidatedBy(getState(), [{ type: 'Transaction', id }])
          .map(({ endpointName, originalArgs }) => {
            if (endpointName === 'getTransaction') {
              return dispatch(transactionApi.util.updateQueryData('getTransaction', originalArgs as ID, (draft) => {
                Object.assign(draft, patch)
              }))
            }
            if (endpointName === 'getTransactions') {
              return dispatch(
                transactionApi.util.updateQueryData('getTransactions', originalArgs as TransactionQuery, (draft) => {
                  // draft — черновик Immer: «мутируем», а на деле получается новый объект.
                  const item = draft.items.find((t) => t.id === id)
                  if (item) Object.assign(item, patch)
                }),
              )
            }
            return null
          })
        try {
          await queryFulfilled
        } catch {
          patches.forEach((p) => p?.undo())
        }
      },
    }),

    deleteTransaction: build.mutation<void, ID>({
      query: (id) => ({ url: `transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Transaction', id }, ...MONEY_TAGS],
    }),

    importTransactions: build.mutation<BulkResult, TransactionInput[]>({
      query: (body) => ({ url: 'transactions/bulk', method: 'POST', body }),
      invalidatesTags: (result) => (result?.created ? MONEY_TAGS : []),
    }),
  }),
})

export const {
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useImportTransactionsMutation,
} = transactionApi
