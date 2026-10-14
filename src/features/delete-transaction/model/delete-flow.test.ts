import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupApi } from 'test-utils'

import { makeStore } from '@/app/model'
import { transactionApi } from '@/entities/transaction'

import { UNDO_MS, deleteRequested, deleteUndone } from './delete-flow'

const ctx = setupApi()
const query = { from: '2026-10-01', to: '2026-10-31', pageSize: 100 }

async function setup() {
  const store = makeStore()
  const sub = store.dispatch(transactionApi.endpoints.getTransactions.initiate(query))
  const page = await sub.unwrap()
  const ids = () => transactionApi.endpoints.getTransactions.select(query)(store.getState()).data!.items.map((t) => t.id)
  return { store, sub, target: page.items[0]!, ids }
}

describe('удаление с отменой (listener middleware)', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('строка исчезает сразу, «Отменить» возвращает её, на сервер ничего не уходит', async () => {
    const { store, sub, target, ids } = await setup()
    store.dispatch(deleteRequested(target))
    expect(ids()).not.toContain(target.id)
    expect(store.getState().toasts.ids).toHaveLength(1)

    store.dispatch(deleteUndone(target.id))
    await vi.advanceTimersByTimeAsync(0)
    expect(ids()).toContain(target.id)

    await vi.advanceTimersByTimeAsync(UNDO_MS + 100)
    expect(() => ctx.db.transaction(target.id)).not.toThrow()
    sub.unsubscribe()
  })

  it('без отмены через UNDO_MS операция удаляется на сервере', async () => {
    const { store, sub, target } = await setup()
    store.dispatch(deleteRequested(target))
    await vi.advanceTimersByTimeAsync(UNDO_MS - 100)
    expect(() => ctx.db.transaction(target.id)).not.toThrow() // ещё ждём

    await vi.advanceTimersByTimeAsync(200)
    await vi.waitFor(() => expect(() => ctx.db.transaction(target.id)).toThrow())
    sub.unsubscribe()
  })

  it('сервер не удалил — строка возвращается, показана ошибка', async () => {
    const { store, sub, target, ids } = await setup()
    ctx.controls.fail = true
    store.dispatch(deleteRequested(target))
    await vi.advanceTimersByTimeAsync(UNDO_MS + 100)
    await vi.waitFor(() => expect(ids()).toContain(target.id))
    const toasts = Object.values(store.getState().toasts.entities)
    expect(toasts.some((t) => t.tone === 'error' && t.message.startsWith('Не удалось удалить'))).toBe(true)
    sub.unsubscribe()
  })
})
