# 8. Список операций и страница «Операции»

| Файл | Слой | Роль |
| --- | --- | --- |
| [transactions-page.tsx](../../src/pages/transactions/ui/transactions-page.tsx) | pages | раскладка: заголовок, фильтры, список |
| [transaction-list.tsx](../../src/widgets/transaction-list/ui/transaction-list.tsx) | widgets | загрузка, итоги, группы по дням, страницы |
| [recent-transactions.tsx](../../src/widgets/transaction-list/ui/recent-transactions.tsx) | widgets | «Последние операции» на главной |

## Страница — только раскладка

```tsx
export function TransactionsPage() {
  const { query, set, reset } = useTransactionFilters()      // фильтры из адреса (страница 7)
  const dispatch = useAppDispatch()
  return (
    <>
      <PageHeader title="Операции" actions={…ссылка «Импорт» и кнопка «+ Операция»…} />
      <div className={s.stack}>
        <TransactionFilters />
        <TransactionList
          query={query}
          onPage={(page) => {
            set({ page })                                     // ?page=3 в адресе
            window.scrollTo({ top: 0, behavior: 'smooth' })   // наверх к началу списка
          }}
          onReset={reset}
        />
      </div>
    </>
  )
}
```

Страница ничего не загружает и не считает. Она **соединяет** фильтры и список: берёт
`query` из одного и передаёт в другой. Так и задумано в FSD: страница — тонкий слой, вся
работа в виджетах и фичах.

`<>…</>` (фрагмент) — потому что `PageHeader` и блок с фильтрами стоят рядом, без общей обёртки.

## Виджет списка: четыре состояния

```tsx
export function TransactionList({ query, onPage, onReset }) {
  const { data, error, isLoading, isFetching, refetch } = useGetTransactionsQuery(query)
```

Один вызов хука — и у нас всё для четырёх состояний. Порядок проверок важен:

```tsx
  if (error) return <Card><ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} /></Card>
```

**1. Ошибка.** Сервер упал или нет сети. «Повторить» вызывает `refetch()`, и пока запрос идёт
(`isFetching`), на кнопке крутилка.

```tsx
  if (isLoading || !data) {
    return <Card>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={48} />)}</Card>
  }
```

**2. Первая загрузка.** Восемь серых полос высотой со строку. `Array.from({ length: 8 }, …)` —
способ сделать массив из восьми элементов, чтобы пройтись по нему `map`. `|| !data` нужен для
TypeScript: ниже он должен быть уверен, что `data` есть.

```tsx
  const pages = Math.ceil(data.total / data.pageSize)        // 73 операции / 30 = 3 страницы

  return (
    <Card className={cx(s.card, isFetching && s.stale)} aria-busy={isFetching}>
```

**3. Обновление.** Переключили страницу или фильтр — старые данные остаются на экране, но
полупрозрачные (`s.stale` → `opacity: 0.6`). Ничего не прыгает, и видно, что идёт загрузка.
`aria-busy` говорит то же самое скринридеру.

```tsx
      <div className={s.totals}>
        <span>Найдено: <b>{data.total}</b></span>
        <span>Доходы <Money value={data.totals.income} sign trim tone="income" /></span>
        <span>Расходы <Money value={-data.totals.expense} trim /></span>
      </div>
```

Итоги — **по всей выборке**, а не по текущей странице. Их считает сервер (`totals` в ответе).
Если бы считали на клиенте по 30 строкам страницы, «Расходы» менялись бы при листании страниц.

```tsx
      {data.items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Ничего не нашлось"
          text="Попробуйте другой период или сбросьте фильтры."
          action={<>
            {onReset && <Button onClick={onReset}>Сбросить фильтры</Button>}
            <Button variant="primary" onClick={() => dispatch(formOpened())}>Добавить операцию</Button>
          </>}
        />
      ) : (
        <TransactionGroups items={data.items} grouped={query.sort !== 'amount'} />
      )}
```

**4. Пусто или данные.** Пустой экран — не тупик: на нём два понятных следующих шага.
`{onReset && …}` — кнопку «Сбросить» показываем, только если родитель передал, что делать.

```tsx
      {pages > 1 && (
        <nav className={s.pager} aria-label="Страницы">
          <Button icon={<ChevronLeft />} disabled={data.page <= 1}
                  onClick={() => onPage(data.page - 1)} aria-label="Предыдущая страница" />
          <span>{data.page} из {pages}</span>
          <Button icon={<ChevronRight />} disabled={data.page >= pages}
                  onClick={() => onPage(data.page + 1)} aria-label="Следующая страница" />
        </nav>
      )}
```

- Одна страница — переключатель не нужен.
- `data.page` — номер страницы **из ответа сервера**, а не из адреса. В адресе может быть
  `?page=99`, а сервер вернёт последнюю существующую, 3. Показываем правду.
- `<nav aria-label="Страницы">` — скринридер покажет это как отдельную навигацию.

### Почему страницы, а не бесконечная прокрутка

У финансов есть итоги и сортировка по сумме: человеку важно «где я в списке». На странице
есть понятная граница, на неё можно сослаться (`?page=3`), а «Назад» возвращает туда же.
Бесконечная лента хороша для соцсетей, где порядок не важен (она сделана в «Прилавке»).

## «Последние операции» на главной

```tsx
export function RecentTransactions({ limit = 6 }) {
  const { data, error, isLoading, isFetching, refetch } = useGetTransactionsQuery({ page: 1, pageSize: limit })
  …
  <TransactionGroups items={data.items} actions={false} />
}
```

Тот же эндпоинт и тот же компонент групп, только другой аргумент (первые 6) и без кнопок.
Добавили операцию — тег `Transaction:LIST` инвалидирован, и обновились **оба** списка: и на
странице «Операции», и на главной.

## Что будет, если…

- **проверять `isLoading` раньше `error`** — при ошибке первого запроса вечно висели бы скелетоны;
- **считать итоги на клиенте** — при листании страниц «Расходы» будут меняться, хотя фильтр тот же;
- **показывать номер страницы из адреса** — по ссылке `?page=99` увидим «99 из 3».

## Проверьте себя

1. В консоли демо выполните `__saldo.controls.latency = 3000` и переключите страницу. Что вы видите 3 секунды?
2. Почему на главной нет кнопок «изменить» и «удалить»?

<details>
<summary>Ответы</summary>

1. Старую страницу полупрозрачной (`isFetching`), а не скелетоны: данные уже были.
   Вернуть скорость: `__saldo.controls.latency = null`.
2. `actions={false}`: на главной это обзор, а не рабочий список. Клик по строке всё равно
   открывает правку.
</details>
