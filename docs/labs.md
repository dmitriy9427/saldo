# Практикум

Восемь заданий на коде проекта, от простого к сложному. В каждом — что сделать, подсказка и
решение. Делайте в отдельной ветке: `git checkout -b labs`.

---

## 1. Новая категория (5 минут)

**Задача:** добавить категорию расходов «Питомцы» с иконкой лапы.

<details><summary>Подсказка</summary>

Категории создаёт демо-сервер (`shared/mock/seed.ts`), иконки — словарь в
`entities/category/ui/category-icon.tsx`. В lucide иконка называется `PawPrint`.
</details>

<details><summary>Решение</summary>

```ts
// seed.ts → CATEGORIES
{ id: 'pets', name: 'Питомцы', kind: 'expense', color: '#f97316', icon: 'paw-print' },
```
```ts
// category-icon.tsx
import { PawPrint } from 'lucide-react'
const ICONS = { …, 'paw-print': PawPrint }
```
Демо-данные хранятся в localStorage, поэтому нажмите «Сбросить демо», чтобы категория появилась.
</details>

---

## 2. Слайс: свернуть боковое меню (15 минут)

**Задача:** кнопка в боковом меню сворачивает его до иконок. Состояние переживает перезагрузку.

<details><summary>Подсказка</summary>

Повторите `features/toggle-theme`: слайс с одним полем, экшен, listener сохраняет в
localStorage, слайс подключается в `combineSlices` в `app/model/store.ts`.
</details>

<details><summary>Решение (основа)</summary>

```ts
export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: () => ({ collapsed: localStorage.getItem('saldo:sidebar') === '1' }),
  reducers: { sidebarToggled: (state) => { state.collapsed = !state.collapsed } },
  selectors: { selectCollapsed: (state) => state.collapsed },
})

startAppListening({
  actionCreator: sidebarToggled,
  effect: (_, api) => localStorage.setItem('saldo:sidebar', api.getState().sidebar.collapsed ? '1' : '0'),
})
```
</details>

---

## 3. Эндпоинт и тег: «Самая большая трата месяца» (20 минут)

**Задача:** карточка на главной: «Самая большая трата октября: Аренда, 38 000 ₽». Карточка
должна обновляться, когда добавили операцию.

<details><summary>Подсказка</summary>

Можно не делать новый эндпоинт: `useGetTransactionsQuery({ ...monthRange(month), type: 'expense', sort: 'amount', pageSize: 1 })`.
Тег `Transaction:LIST` уже наклеен — обновление будет само.
</details>

---

## 4. Оптимистичное создание (30 минут)

**Задача:** новая операция появляется в списке **сразу**, ещё до ответа сервера, с пометкой «сохраняется…».

<details><summary>Подсказка</summary>

В `createTransaction` добавьте `onQueryStarted`. Через `selectCachedArgsForQuery(getState(), 'getTransactions')`
найдите закешированные страницы и `updateQueryData`-ом добавьте временную запись `{ id: 'tmp-…' }`
в начало первой страницы. При ошибке — `undo()`. При успехе ничего делать не нужно:
инвалидация перезапросит список с настоящим id.
</details>

---

## 5. Новый фильтр в адресе (20 минут)

**Задача:** фильтр «Только крупные: от 5 000 ₽» на странице операций, `?min=500000`.

<details><summary>Подсказка</summary>

1. `features/filter-transactions/model/use-filters.ts`: добавить `min` в `Filters`, `parseFilters`, `toQuery`, `PARAM`.
2. `shared/api/types.ts`: `min?: number` в `TransactionQuery`.
3. `shared/mock/db.ts`: условие `(!query.min || t.amount >= query.min)`.
4. `handlers.ts`: `min: q.min ? Number(q.min) : undefined`.
5. Тест в `use-filters.test.ts`.
</details>

---

## 6. FSD: куда положить (10 минут, без кода)

Разложите по слоям и слайсам: «экспорт операций в CSV», «аватар пользователя», «страница
профиля», «функция склонения слов», «карточка цели накоплений», «кнопка "Пополнить цель"».

<details><summary>Ответ</summary>

`features/export-transactions`, `entities/user/ui`, `pages/profile`, `shared/lib`,
`entities/goal/ui`, `features/top-up-goal`.
</details>

---

## 7. Тест на listener (20 минут)

**Задача:** тест, что сохранение темы пишет в localStorage, а выбор «system» удаляет ключ.

<details><summary>Решение</summary>

```ts
it('тема сохраняется', () => {
  const store = makeStore()
  store.dispatch(themeChanged('dark'))
  expect(localStorage.getItem('saldo:theme')).toBe('dark')
  store.dispatch(themeChanged('system'))
  expect(localStorage.getItem('saldo:theme')).toBeNull()
})
```
</details>

---

## 8. Сломайте и почините (15 минут)

По очереди внесите ошибки и посмотрите, что их поймает:

| Поломка | Кто поймает |
| --- | --- |
| тело `parseMoney` замените на `return Math.round(Number(input) * 100)` | ? |
| уберите `'Budget'` из `MONEY_TAGS` | ? |
| в `TransactionRow` импортируйте `CategoryIcon` напрямую | ? |
| в карточке бюджета верните `minmax(300px, 1fr)` | ? |

<details><summary>Ответ</summary>

1. `Math.round` спасает от `114.999…`, но `Number('1 234,5')` — это `NaN`: пробелы, запятые и
   «₽» больше не понимаются → падает `money.test.ts`.
2. Бюджеты не обновятся после новой операции. Тестов на это нет — хороший повод написать.
3. Steiger: `fsd/forbidden-imports` → `npm run lint`.
4. `npm run check:mobile` и e2e на телефоне: прокрутка вбок на 320 px.
</details>
