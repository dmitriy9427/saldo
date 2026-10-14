import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { setupApi, settle } from 'test-utils'

import { makeStore } from '@/app/model'
import { API_URL } from '@/shared/config'

import { transactionApi } from './transaction-api'

const ctx = setupApi()
const query = { from: '2026-10-01', to: '2026-10-31', pageSize: 100 }
const input = { type: 'expense' as const, date: '2026-10-14', amount: 77_700, accountId: 'card', toAccountId: null, categoryId: 'cafe', note: 'Из теста' }

describe('transactionApi (RTK Query + MSW)', () => {
  it('создание инвалидирует список: подписанный запрос перезапрашивается сам', async () => {
    const store = makeStore()
    // Подписка — как у смонтированного компонента (useGetTransactionsQuery).
    const sub = store.dispatch(transactionApi.endpoints.getTransactions.initiate(query))
    await sub
    const before = transactionApi.endpoints.getTransactions.select(query)(store.getState()).data!.total

    await store.dispatch(transactionApi.endpoints.createTransaction.initiate(input)).unwrap()
    await settle(store)

    const after = transactionApi.endpoints.getTransactions.select(query)(store.getState()).data!
    expect(after.total).toBe(before + 1)
    expect(after.items.some((t) => t.note === 'Из теста')).toBe(true)
    sub.unsubscribe()
  })

  it('правка видна сразу (оптимистично) и откатывается, если сервер отказал', async () => {
    const store = makeStore()
    const sub = store.dispatch(transactionApi.endpoints.getTransactions.initiate(query))
    const page = await sub.unwrap()
    const target = page.items.find((t) => t.type === 'expense')!
    const noteOf = () =>
      transactionApi.endpoints.getTransactions.select(query)(store.getState()).data!.items.find((t) => t.id === target.id)!.note

    ctx.server.use(
      http.patch(`${API_URL}/transactions/:id`, () =>
        HttpResponse.json({ message: 'Проверьте поля', fields: { note: 'Нельзя' } }, { status: 422 }),
      ),
    )
    const pending = store.dispatch(transactionApi.endpoints.updateTransaction.initiate({ id: target.id, patch: { note: 'Новая заметка' } }))
    expect(noteOf()).toBe('Новая заметка') // ещё до ответа сервера

    await expect(pending.unwrap()).rejects.toMatchObject({ status: 422 })
    expect(noteOf()).toBe(target.note) // откат
    sub.unsubscribe()
  })

  it('ошибка сервера доходит до компонента как error, а не исключение', async () => {
    const store = makeStore()
    ctx.controls.fail = true
    const result = await store.dispatch(transactionApi.endpoints.getTransactions.initiate(query))
    expect(result.error).toMatchObject({ status: 503 })
  })
})
