/**
 * Помощники для тестов: настоящий store приложения + демо-сервер MSW в Node.
 * Тест работает с тем же кодом, что и браузер: RTK Query делает fetch, MSW
 * отвечает из той же «базы» (shared/mock/db.ts).
 */
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { makeStore } from '@/app/model'
import { createTestServer } from '@/shared/mock/node'

/** Поднять MSW на время файла тестов. Каждый вызов — свежая база. */
export function setupApi() {
  const ctx = createTestServer()
  beforeAll(() => ctx.server.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => {
    ctx.server.resetHandlers()
    ctx.controls.fail = false
  })
  afterAll(() => ctx.server.close())
  return ctx
}

export function renderWithStore(ui: ReactNode, { route = '/', store = makeStore() } = {}) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  }
}

/** Дождаться, пока все запросы RTK Query в store завершатся. */
export async function settle(store: ReturnType<typeof makeStore>) {
  const { baseApi } = await import('@/shared/api')
  await Promise.all(store.dispatch(baseApi.util.getRunningQueriesThunk()))
  await Promise.all(store.dispatch(baseApi.util.getRunningMutationsThunk()))
}
