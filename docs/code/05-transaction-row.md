# 5. Строка операции и группы по дням

Три файла, три слоя — хороший пример композиции в FSD:

| Файл | Слой | Роль |
| --- | --- | --- |
| [transaction-row.tsx](../../src/entities/transaction/ui/transaction-row.tsx) | entities | одна строка: иконка, название, подпись, сумма, место под кнопки |
| [group-by-day.ts](../../src/entities/transaction/lib/group-by-day.ts) | entities | разложить операции по дням |
| [transaction-groups.tsx](../../src/widgets/transaction-list/ui/transaction-groups.tsx) | widgets | собрать всё вместе: категории, счета, кнопки |

## Где на экране

```
Сегодня                                                  −402 ₽   ← заголовок дня + итог дня
[🚌]  Транспорт                                          −402 ₽   ← TransactionRow
      Электричка · Основная карта
Вчера                                                  −2 626 ₽
[🚌]  Транспорт                                          −126 ₽
      Такси · Основная карта                       [✏️] [🗑]      ← кнопки при наведении
```

---

## TransactionRow — «глупая» строка

### Что делает

- Рисует одну операцию: иконку, название категории, подпись (заметка · счёт), сумму.
- Для перевода вместо категории — стрелки и «Основная карта → Наличные».
- Клик по названию — `onOpen` (открыть на правку).
- Справа — место для кнопок, которые передадут снаружи.

### «Глупая» — это как?

Строка **ничего не загружает и ничего не знает** о других сущностях. Всё, что ей нужно,
приходит пропсами:

| Проп | Откуда возьмётся | Почему не внутри |
| --- | --- | --- |
| `transaction` | список операций | — |
| `icon` | `<CategoryIcon>` из `entities/category` | сущность не может импортировать соседнюю |
| `category`, `account`, `toAccount` | словари категорий и счетов | то же |
| `actions` | кнопки из `features/*` | сущность не может импортировать фичи (слой выше) |
| `onOpen` | `dispatch(formOpened(...))` | то же |

Плюс: строку можно показать где угодно — в списке с кнопками, на главной без кнопок, в
результатах поиска — и она везде одинаковая.

### Код

```tsx
export function TransactionRow({ transaction: t, icon, category, account, toAccount, actions, onOpen }) {
```

`transaction: t` — переименование при деструктуризации: проп называется `transaction`, а внутри
удобно короче, `t`.

```tsx
  const title = t.type === 'transfer'
    ? 'Перевод'
    : (category?.name ?? (t.categoryId ? '…' : 'Без категории'))
```

Три случая:
- перевод → «Перевод»;
- категория загружена → её название;
- категория у операции **есть**, но ещё не загружена → «…».

Последний случай — исправленный баг: раньше на долю секунды мелькало «Без категории», и это
была неправда. Его поймал e2e-тест в CI, где запросы приходят в разном порядке.

`?.` («опциональная цепочка») — если `category` равен `undefined`, то `category?.name` тоже
`undefined`, без ошибки. `??` — «если слева `null` или `undefined`, взять правое».

```tsx
  const subtitle = t.type === 'transfer'
    ? `${account?.name ?? '…'} → ${toAccount?.name ?? '…'}`
    : [t.note, account?.name].filter(Boolean).join(' · ')
```

`[заметка, счёт].filter(Boolean).join(' · ')` — склеить через точку только непустые части:

| `note` | `account.name` | Результат |
| --- | --- | --- |
| `'Пятёрочка'` | `'Основная карта'` | `Пятёрочка · Основная карта` |
| `''` | `'Основная карта'` | `Основная карта` (без лишней точки) |

`filter(Boolean)` выбрасывает пустые строки, `undefined` и `null`.

```tsx
  return (
    <div className={s.row}>
      {t.type === 'transfer' ? <span className={s.transfer} aria-hidden><ArrowRightLeft /></span> : icon}
      <button type="button" className={s.main} onClick={onOpen} disabled={!onOpen}>
        <span className={s.title}>{title}</span>
        <span className={s.subtitle}>{subtitle}</span>
      </button>
```

Название — это `<button>`, а не `<div onClick>`. Кнопка доступна с клавиатуры (Tab, Enter),
и скринридер знает, что по ней можно нажать. `disabled={!onOpen}` — если открывать нечего
(например, на главной), кнопка неактивна.

```tsx
      <Money
        value={signedAmount(t)}
        sign={t.type !== 'transfer'}
        trim
        tone={t.type === 'income' ? 'income' : t.type === 'transfer' ? 'muted' : undefined}
      />
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  )
```

`signedAmount` — сумма со знаком: расход −, доход +. В базе сумма всегда положительная, а
знак задаёт тип. Расход — обычным цветом: красный оставлен для перерасхода, иначе весь
список был бы красным и тревожным.

### Кнопки при наведении — чистый CSS

```scss
.actions {
  position: absolute;          // поверх суммы, не занимают места
  right: 8px;
  opacity: 0;                  // в покое не видны
  pointer-events: none;        // и не ловят клики

  .row:hover &,                // навели на строку…
  .row:focus-within & {        // …или фокус внутри строки (Tab с клавиатуры)
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {       // телефон: наведения нет — кнопки видны всегда
    position: static;
    opacity: 1;
  }
}
```

`:focus-within` — «внутри меня есть элемент с фокусом». Без него кнопки нельзя было бы
нажать с клавиатуры: Tab попадал бы на невидимую кнопку.

---

## groupByDay — разложить по дням

```ts
export function groupByDay(items: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const t of items) {
    let group = groups.at(-1)                      // последняя группа (или undefined)
    if (group?.date !== t.date) {                  // день сменился — новая группа
      group = { date: t.date, items: [], net: 0 }
      groups.push(group)
    }
    group.items.push(t)
    if (t.type === 'income') group.net += t.amount
    if (t.type === 'expense') group.net -= t.amount
  }
  return groups
}
```

Работает за **один проход**, потому что сервер уже отдал операции по порядку дат. Пример:

```
вход:  [14.10 Такси, 14.10 Кафе, 13.10 Продукты]
шаг 1: групп нет → новая {14.10, [Такси]}
шаг 2: последняя группа 14.10 = 14.10 → добавить → {14.10, [Такси, Кафе]}
шаг 3: 14.10 ≠ 13.10 → новая {13.10, [Продукты]}
выход: [{14.10, 2 шт.}, {13.10, 1 шт.}]
```

`groups.at(-1)` — последний элемент массива (раньше писали `groups[groups.length - 1]`).

Функция чистая — без React — и поэтому живёт в `lib`, а не в компоненте. Её легко проверить тестом.

---

## TransactionGroups — сборка

```tsx
export function TransactionGroups({ items, grouped = true, actions = true }) {
  const { byId: categories } = useCategoryMap()          // словарь категорий (entities/category)
  const { data: accounts = [] } = useGetAccountsQuery()   // счета (entities/account)
  const dispatch = useAppDispatch()
  const account = (id) => accounts.find((a) => a.id === id)
```

Виджет стоит **выше** сущностей и фич, поэтому может импортировать их всех.

```tsx
  const row = (t: Transaction) => (
    <li key={t.id}>
      <TransactionRow
        transaction={t}
        icon={<CategoryIcon category={categories.get(t.categoryId)} />}
        category={categories.get(t.categoryId)}
        account={account(t.accountId)}
        toAccount={account(t.toAccountId)}
        onOpen={() => dispatch(formOpened({ editing: t }))}
        actions={actions && (
          <>
            <Button variant="ghost" size="sm" icon={<Pencil />} aria-label="Изменить операцию"
                    onClick={() => dispatch(formOpened({ editing: t }))} />
            <DeleteTransactionButton transaction={t} />
          </>
        )}
      />
    </li>
  )
```

Вот здесь детали встречаются: строка из `entities/transaction`, иконка из `entities/category`,
открытие формы из `features/transaction-form`, удаление из `features/delete-transaction`.

`<>…</>` — фрагмент: «несколько элементов без обёртки».

```tsx
  if (!grouped) return <ul className={s.rows}>{items.map(row)}</ul>

  return (
    <div className={s.groups}>
      {groupByDay(items).map((group) => (
        <section key={group.date} aria-label={formatDayHeading(group.date)}>
          <header className={s.day}>
            <span>{formatDayHeading(group.date)}</span>
            {group.net !== 0 && <Money value={group.net} sign trim tone="muted" />}
          </header>
          <ul className={s.rows}>{group.items.map(row)}</ul>
        </section>
      ))}
    </div>
  )
}
```

- Сортировка по сумме (`grouped = false`) — группы по дням не имеют смысла, показываем плоский список.
- `formatDayHeading` — «Сегодня», «Вчера» или «12 октября, понедельник».
- Заголовок дня в CSS — `position: sticky; top: 0`: при прокрутке он «прилипает» к верху
  карточки, и всегда видно, какой это день.

## Проверьте себя

1. Почему `TransactionRow` не загружает категории сама через `useCategoryMap()`?
2. Что покажет строка, если у операции `note: ''`, а счёт ещё не загрузился?
3. Почему `groupByDay` не сортирует операции сама?

<details>
<summary>Ответы</summary>

1. Это сущность `transaction`, а категории — соседняя сущность: по правилам FSD нельзя.
   Заодно строка остаётся простой и одинаковой везде.
2. Пустую подпись: `['', undefined].filter(Boolean)` даёт `[]`, после `join` — пустая строка.
3. Сервер уже отдаёт в нужном порядке, в том числе «сначала старые». Сортировка внутри
   сломала бы выбранный порядок и стоила бы лишний проход.
</details>
