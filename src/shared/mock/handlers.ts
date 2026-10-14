/**
 * HTTP-обработчики демо-сервера (MSW). Здесь только «транспорт»: разобрать
 * адрес и тело запроса, вызвать метод базы (db.ts), упаковать ответ и коды:
 *   200/201 — успех, 204 — удалено, 404 — нет такой записи,
 *   422 — ошибки проверки по полям (их покажет форма), 503 — «сервер упал».
 */
import { HttpResponse, delay, http } from 'msw'

import type { TransactionQuery } from '../api/types'
import { type Db, NotFoundError, ValidationError } from './db'

export interface MockControls {
  /** Все запросы отвечают 503 — проверить экраны ошибок. */
  fail: boolean
  /** Задержка ответа, мс. null — «как в жизни», 120–450 мс. */
  latency: number | null
}

export function createHandlers(db: Db, base: string, controls: MockControls) {
  const handle =
    <A extends { request: Request; params: Record<string, string | readonly string[] | undefined> }>(
      fn: (args: A) => unknown | Promise<unknown>,
      status = 200,
    ) =>
    async (args: A) => {
      await delay(controls.latency ?? 120 + Math.random() * 330)
      if (controls.fail) return HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 })
      try {
        const body = await fn(args)
        return body === undefined ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(body, { status })
      } catch (error) {
        if (error instanceof ValidationError) return HttpResponse.json(error.body, { status: 422 })
        if (error instanceof NotFoundError) return HttpResponse.json({ message: error.message }, { status: 404 })
        console.error('[mock]', error)
        return HttpResponse.json({ message: 'Ошибка сервера' }, { status: 500 })
      }
    }

  const query = (request: Request) => Object.fromEntries(new URL(request.url).searchParams)
  const param = (value: string | readonly string[] | undefined) => String(value)

  return [
    http.get(`${base}/accounts`, handle(() => db.accounts())),
    http.get(`${base}/categories`, handle(() => db.categories())),

    http.get(
      `${base}/transactions`,
      handle(({ request }) => {
        const q = query(request)
        const params: TransactionQuery = {
          ...q,
          type: q.type as TransactionQuery['type'],
          sort: q.sort as TransactionQuery['sort'],
          dir: q.dir as TransactionQuery['dir'],
          page: q.page ? Number(q.page) : undefined,
          pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        }
        return db.transactions(params)
      }),
    ),
    http.get(`${base}/transactions/:id`, handle(({ params }) => db.transaction(param(params.id)))),
    http.post(`${base}/transactions/bulk`, handle(async ({ request }) => db.bulkCreate((await request.json()) as unknown[]), 201)),
    http.post(`${base}/transactions`, handle(async ({ request }) => db.createTransaction(await request.json()), 201)),
    http.patch(
      `${base}/transactions/:id`,
      handle(async ({ request, params }) => db.updateTransaction(param(params.id), await request.json())),
    ),
    http.delete(`${base}/transactions/:id`, handle(({ params }) => db.deleteTransaction(param(params.id)))),

    http.get(`${base}/stats/summary`, handle(({ request }) => db.summary(query(request).month ?? ''))),
    http.get(
      `${base}/stats/cashflow`,
      handle(({ request }) => db.cashflow(Number(query(request).months ?? 12), query(request).end)),
    ),

    http.get(`${base}/budgets`, handle(({ request }) => db.budgets(query(request).month ?? ''))),
    http.put(
      `${base}/budgets/:categoryId`,
      handle(async ({ request, params }) => {
        const body = (await request.json()) as { limit?: unknown }
        return db.setBudget(param(params.categoryId), body.limit)
      }),
    ),
    http.delete(`${base}/budgets/:categoryId`, handle(({ params }) => db.deleteBudget(param(params.categoryId)))),

    http.post(`${base}/demo/reset`, handle(() => db.reset())),
  ]
}

export { ValidationError }
