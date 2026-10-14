# 03. RTK Query

RTK Query — слой данных в Redux Toolkit: запросы, кеш, состояния загрузки, перезапрос после
изменений. Похож на TanStack Query (он в «Прилавке»), но кеш лежит в Redux и связи между
запросами задаются тегами.

## Один createApi на приложение

[shared/api/base.ts](../src/shared/api/base.ts):

```ts
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: ['Transaction', 'Account', 'Category', 'Stats', 'Budget'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
})
```

Эндпоинтов здесь нет: каждая сущность добавляет свои через `injectEndpoints`
([entities/transaction/api/transaction-api.ts](../src/entities/transaction/api/transaction-api.ts)).
Так `shared` ничего не знает о сущностях, а кеш и теги общие. Будь у каждой сущности свой
`createApi`, мутация операции не смогла бы инвалидировать бюджеты.

## Теги: кто кого обновляет

```ts
getTransactions: build.query<TransactionPage, TransactionQuery>({
  query: (query) => `transactions?${toSearchParams(query)}`,
  providesTags: (result) => [
    { type: 'Transaction', id: 'LIST' },
    ...(result?.items.map((t) => ({ type: 'Transaction' as const, id: t.id })) ?? []),
  ],
}),
createTransaction: build.mutation<Transaction, TransactionInput>({
  query: (body) => ({ url: 'transactions', method: 'POST', body }),
  invalidatesTags: [{ type: 'Transaction', id: 'LIST' }, 'Account', 'Stats', 'Budget'],
}),
```

- Запрос **предоставляет** теги, мутация **инвалидирует**. Все активные запросы с
  инвалидированным тегом перезапрашиваются; неактивные помечаются устаревшими.
- `LIST` — тег «список целиком»: новая операция может попасть на любую страницу.
- `{ type, id }` — конкретная запись: правка одной операции не трогает чужие страницы
  (кроме тех, где эта операция есть).
- Тег без id (`'Account'`) инвалидирует **всё** с этим типом.
- Мутация, упавшая с ошибкой, ничего не инвалидирует:
  `invalidatesTags: (r, error) => error ? [] : […]`.

## Ключ кеша — аргумент

`useGetTransactionsQuery({ month, type, page })`: RTK Query сериализует аргумент (порядок
ключей не важен) — это и есть ключ кеша. Вернулись на страницу 1 — она уже в кеше и
показывается мгновенно, а в фоне перезапрашивается, если устарела.

Два компонента с одинаковым запросом (карточки месяца и «бублик» на главной используют
`getMonthSummary(month)`) — **один** запрос на сервер, данные общие.

## isLoading и isFetching

- `isLoading` — данных ещё нет совсем: показываем скелетоны.
- `isFetching` — идёт запрос, но старые данные есть (сменили месяц): показываем старые
  полупрозрачными. Размер блоков не прыгает, человек видит, что идёт обновление.

## Оптимистичные обновления

Правка операции видна сразу, до ответа сервера:

```ts
async onQueryStarted({ id, patch }, { dispatch, getState, queryFulfilled }) {
  const patches = transactionApi.util
    .selectInvalidatedBy(getState(), [{ type: 'Transaction', id }])   // где эта операция в кеше
    .map(({ endpointName, originalArgs }) =>
      dispatch(transactionApi.util.updateQueryData(endpointName, originalArgs, (draft) => { … })))
  try { await queryFulfilled } catch { patches.forEach((p) => p.undo()) }
}
```

- `selectInvalidatedBy` находит все закешированные запросы с этим тегом — все страницы
  списка, где есть операция, и саму операцию.
- `updateQueryData` правит черновик Immer и возвращает «патч» с `undo()`.
- Сервер ответил 422 — откат. Тест: [transaction-api.test.ts](../src/entities/transaction/api/transaction-api.test.ts).

Удаление в приложении — тоже оптимистичное, но с отменой (глава 02).

## selectFromResult

[entities/category/api/category-api.ts](../src/entities/category/api/category-api.ts):

```ts
useGetCategoriesQuery(undefined, {
  selectFromResult: ({ data = EMPTY }) => ({ categories: data, byId: indexById(data) }),
})
```

Компонент подписывается не на весь результат, а на то, что вернули. Важно возвращать
**стабильные ссылки**: `EMPTY` — константа, словарь кешируется в `WeakMap` по массиву. Иначе
каждый рендер давал бы новый объект и лишние перерисовки.

## Время жизни кеша

- `keepUnusedDataFor: 60` — данные без подписчиков живут минуту.
- Категории — `Infinity`: они не меняются, перезапрашивать незачем.
- `refetchOnFocus` — вернулись на вкладку, данные освежились (нужен `setupListeners`).
- Сброс демо — `baseApi.util.resetApiState()`: весь кеш выбрасывается, активные запросы
  загружаются заново ([features/reset-demo](../src/features/reset-demo/api/reset-api.ts)).

## Ошибки

`fetchBaseQuery` не бросает исключения: ошибка приходит в `error` с полем `status`
(число — HTTP-код; `'FETCH_ERROR'` — нет сети). [errorMessage()](../src/shared/api/base.ts)
превращает её в текст, а `fieldErrors()` достаёт ошибки по полям из ответа 422 для формы.
В мутациях — `.unwrap()`: тогда ошибка бросается, и её удобно ловить в `try/catch`.

## RTK Query или TanStack Query

| | RTK Query | TanStack Query |
| --- | --- | --- |
| Где кеш | в Redux (видно в DevTools) | свой QueryClient |
| Связи «изменил X → обнови Y» | теги, декларативно | `invalidateQueries(ключ)` вручную |
| Описание запросов | эндпоинты в одном месте | `queryKey` + `queryFn` у вызова |
| Когда выбрать | уже есть Redux, много связанных сущностей | Redux нет, нужна гибкость (бесконечные списки, suspense) |

Оба решают одну задачу; в вакансиях с Redux почти всегда — RTK Query.
