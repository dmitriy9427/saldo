# 10. Тесты и публикация

```bash
npm test        # Vitest: функции, слайсы, RTK Query + MSW, компоненты
npm run e2e     # Playwright: собранное приложение в браузере
npm run check   # oxlint + Steiger, типы, тесты, сборка
```

## Пирамида

| Уровень | Что | Пример |
| --- | --- | --- |
| Чистые функции | деньги, даты, разбор CSV, темп бюджета, фильтры из адреса | [money.test.ts](../src/shared/lib/money.test.ts) |
| Демо-база | фильтры, итоги, остатки, проверки, дубликаты | [db.test.ts](../src/shared/mock/db.test.ts) |
| Redux | слайс импорта, мемоизация селекторов | [import-slice.test.ts](../src/features/import-statement/model/import-slice.test.ts) |
| RTK Query + MSW | инвалидация тегов, оптимистичное обновление и откат | [transaction-api.test.ts](../src/entities/transaction/api/transaction-api.test.ts) |
| Listener + таймеры | удаление с отменой | [delete-flow.test.ts](../src/features/delete-transaction/model/delete-flow.test.ts) |
| Компоненты | форма: свои ошибки, ошибки сервера, сохранение | [transaction-form.test.tsx](../src/features/transaction-form/ui/transaction-form.test.tsx) |
| E2E | сценарии в браузере, телефон | [e2e/app.spec.ts](../e2e/app.spec.ts) |

## RTK Query в тестах — без моков fetch

[test/utils.tsx](../test/utils.tsx): настоящий store приложения + MSW в Node. Тест работает
с тем же кодом, что и браузер. Подписка на запрос — как у смонтированного компонента:

```ts
const sub = store.dispatch(transactionApi.endpoints.getTransactions.initiate(query))
await store.dispatch(transactionApi.endpoints.createTransaction.initiate(input)).unwrap()
await settle(store) // дождаться перезапросов после инвалидации
```

Ответ сервера под конкретный тест — `server.use(http.patch(…, () => HttpResponse.json(…, { status: 422 })))`.

## Фейковые таймеры для listener

Удаление ждёт 5 секунд. `vi.useFakeTimers({ shouldAdvanceTime: true })` и
`vi.advanceTimersByTimeAsync(UNDO_MS)` — тест проходит за миллисекунды. `shouldAdvanceTime`
нужен, чтобы промисы MSW и fetch продолжали работать.

## jsdom и `<dialog>`

В jsdom нет `showModal()` — простая замена в [test-setup.ts](../src/shared/config/test-setup.ts).
Поведение настоящего диалога (фокус, Esc) проверяет Playwright в браузере.

## Playwright

[playwright.config.ts](../playwright.config.ts): `vite build` + `vite preview`, два проекта —
компьютер и телефон (Pixel 7). Локально запускается в установленном Google Chrome
(`channel: 'chrome'`), чтобы не скачивать отдельный Chromium; в CI — Chromium из
`npx playwright install`.

Сценарии: главная, новая операция по клавише N и после перезагрузки, клик по категории →
фильтр в адресе, удаление с отменой, импорт, телефон без горизонтальной прокрутки.

## CI и GitHub Pages

[.github/workflows/pages.yml](../.github/workflows/pages.yml): линтеры, типы, тесты, e2e, затем
сборка с `VITE_BASE=/saldo/` и публикация. Сломанный код на сайт не попадёт.

- `base` в Vite и `basename` в роутере — сайт живёт в подпапке `/saldo/`;
- `404.html` — копия `index.html`: GitHub Pages на `/saldo/transactions` отдаёт 404.html,
  а это то же приложение — роутер покажет нужную страницу;
- путь к `mockServiceWorker.js` — тоже с `BASE_URL`.
