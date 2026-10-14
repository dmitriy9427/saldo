# 02. Redux Toolkit

Redux — один объект состояния (store), который меняется только экшенами через чистые функции
(редьюсеры). Redux Toolkit (RTK) — официальный способ писать Redux без шаблонного кода:
`configureStore`, `createSlice`, Immer внутри, DevTools и проверки из коробки.

## Что где хранится

Первое решение — не «что положить в Redux», а **какое это состояние**:

| Вид | Пример | Где живёт |
| --- | --- | --- |
| Серверное | операции, счета, отчёты | кеш RTK Query (глава 03) |
| В адресе | фильтры списка, выбранный месяц | `?month=2026-09&category=cafe` |
| Клиентское общее | тема, тосты, черновик импорта, открыта ли форма | слайсы Redux |
| Локальное | открыт ли выпадающий список, наведение на сектор | `useState` |

Частая ошибка — копировать ответ сервера в слайс: появляются два источника правды, и они
расходятся. Здесь серверные данные есть только в кеше RTK Query.

## Store

[src/app/model/store.ts](../src/app/model/store.ts):

```ts
const rootReducer = combineSlices(baseApi, toastSlice, themeSlice, importSlice, transactionFormSlice)

configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware).concat(baseApi.middleware),
})
setupListeners(store.dispatch) // refetchOnFocus / refetchOnReconnect
```

- `combineSlices` берёт имя ключа из `slice.name` и `api.reducerPath` — не нужно писать
  `{ toasts: toastSlice.reducer, … }` и следить, чтобы имя совпало.
- `getDefault()` уже включает thunk и проверки в режиме разработки: что состояние не
  мутируют и что в нём только сериализуемые данные.
- `makeStore()` — функция, а не готовый store: в тестах каждый тест получает свой.

## createSlice

```ts
export const themeSlice = createSlice({
  name: 'theme',
  initialState: () => ({ mode: readSaved() }),   // функция — localStorage читается при создании store
  reducers: {
    themeChanged: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload                 // «мутация» — это Immer, на деле новый объект
    },
  },
  selectors: { selectThemeMode: (state) => state.mode },
})
```

`selectors` внутри слайса получают **состояние слайса**, а не всего store. Снаружи
`useAppSelector(selectThemeMode)` работает с RootState — RTK сам подставит `state.theme`.

### prepare: подготовить payload

[shared/model/toast.ts](../src/shared/model/toast.ts): id тоста генерируется в `prepare`, а не
в редьюсере. Редьюсер обязан быть чистым: одинаковый вход → одинаковый выход. `nanoid()` в
редьюсере сломал бы это (и «перемотку» в DevTools).

## createEntityAdapter

Коллекция с id: `{ ids: [...], entities: { [id]: item } }`. Адаптер даёт готовые
`addOne`, `removeOne`, `setAll`… и селекторы `selectAll`, `selectById`. Поиск по id — O(1),
порядок — в `ids`. В приложении на адаптере тосты.

## createSelector: производные данные

[features/import-statement/model/import-slice.ts](../src/features/import-statement/model/import-slice.ts).
В состоянии мастера импорта — только исходные данные: таблица из файла, разметка колонок,
правки пользователя. Строки для показа, итоги и тела запросов **вычисляются**:

```ts
export const selectParsedRows = createSelector([selectTable, selectMapping, selectHasHeader], buildRows)
export const selectReviewRows = createSelector([selectParsedRows, selectOverrides], (rows, overrides) => …)
```

- пересчёт только когда изменился вход (по ссылке);
- результат — тот же массив по ссылке, если ничего не поменялось: `useSelector` не
  перерисует компонент. Тест это проверяет: экшен «ни о чём» → `toBe(тот же массив)`.

Правило: **не храните то, что можно вычислить**. Иначе при каждом изменении придётся
обновлять и исходное, и производное — и однажды забудете.

## Listener middleware: сценарии с ожиданием

[features/delete-transaction/model/delete-flow.ts](../src/features/delete-transaction/model/delete-flow.ts) —
удаление с отменой:

```ts
startAppListening({
  actionCreator: deleteRequested,
  effect: async ({ payload: transaction }, api) => {
    const patches = …                          // 1. убрать строку из кеша RTK Query
    api.dispatch(toastShown({ …, action: { label: 'Отменить', action: deleteUndone(id) } }))
    const undone = await api.take((a) => deleteUndone.match(a) && a.payload === id, UNDO_MS)
    if (undone) return patches.forEach((p) => p.undo())
    await api.dispatch(transactionApi.endpoints.deleteTransaction.initiate(id)).unwrap()
  },
})
```

- `api.take(предикат, таймаут)` — «дождаться экшена»: вернёт его или `null` по таймауту.
- Почему не `setTimeout` в компоненте: строка исчезла — компонент размонтирован, его таймеры
  и обработчики уже не выполнятся. Listener живёт в store.
- Кнопка в тосте — **экшен**, а не функция: в состоянии только сериализуемые данные.

Ещё один listener — сохранение темы в localStorage на `themeChanged`. В редьюсере писать на
диск нельзя (побочный эффект), в компоненте — разбросано.

Что выбрать для побочных эффектов: запросы к серверу — RTK Query; реакции «на экшен сделать
X» и сценарии с ожиданием — listener middleware; thunk — разовое асинхронное действие,
вызываемое из компонента. Саги в новых проектах почти не нужны.

## Типы и FSD

Хуки `useAppSelector` / `useAppDispatch` нужны во всех слоях, а тип `RootState` собирается в
`app` — импортировать его снизу нельзя. Решение из документации FSD — глобальные типы
([app/model/global.d.ts](../src/app/model/global.d.ts)):

```ts
declare global {
  type RootState = RootStateType
  type AppDispatch = AppStore['dispatch']
}
```

[shared/model/hooks.ts](../src/shared/model/hooks.ts) пользуется ими, ничего не импортируя:

```ts
export const useAppSelector = useSelector.withTypes<RootState>()
```

`.withTypes` появился в react-redux 9 — раньше писали `TypedUseSelectorHook`.
