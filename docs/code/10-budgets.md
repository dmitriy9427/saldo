# 10. Бюджеты

Четыре файла, три слоя:

| Файл | Слой | Роль |
| --- | --- | --- |
| [pace.ts](../../src/entities/budget/lib/pace.ts) | entities | расчёт: укладываемся ли, прогноз, сколько можно в день |
| [budget-bar.tsx](../../src/entities/budget/ui/budget-bar.tsx) | entities | полоса с отметкой «сегодня» |
| [budget-form.tsx](../../src/features/set-budget/ui/budget-form.tsx) | features | окно «Новый бюджет / Изменить лимит» |
| [budget-list.tsx](../../src/widgets/budget-list/ui/budget-list.tsx) | widgets | карточки бюджетов: на главной (4 штуки) и на странице «Бюджеты» |

## Где на экране

```
[☕] Кафе и рестораны                  5 993,50 ₽ из 9 000 ₽
██████████████████████│░░░░░░░░░░                      ← полоса; │ — «сегодня»
При таком темпе выйдет 13 271 ₽ — притормозите
Добавить трату                                [✏️] [🗑]
```

## Часть 1. budgetPace — главная мысль бюджетов

«Потрачено 60 %» само по себе ничего не говорит. 60 % к **25-му** числу — отлично, к **5-му** —
тревога. Поэтому сравниваем две доли: сколько **потрачено** и сколько **месяца прошло**.

```ts
export function budgetPace(spent: number, limit: number, day: number, daysInMonth: number): BudgetPace {
  const used = limit > 0 ? spent / limit : 0                  // ① доля потраченного
  const elapsed = Math.min(1, day / daysInMonth)              // ② доля прошедшего месяца
  const forecast = elapsed > 0 ? Math.round(spent / elapsed / 100) * 100 : spent  // ③ прогноз
  const left = limit - spent                                  // ④ осталось
  const daysLeft = daysInMonth - day + 1
  const perDay = left > 0 ? Math.floor(left / daysLeft / 100) * 100 : 0           // ⑤ в день
  const state = spent > limit ? 'over' : forecast > limit && used > 0.5 ? 'warning' : 'ok'  // ⑥
  return { used, elapsed, forecast, left, perDay, state }
}
```

Пример: лимит на кафе 9 000 ₽, 14 октября (14 из 31 дня), потрачено 5 993,50 ₽.

| Шаг | Расчёт | Результат |
| --- | --- | --- |
| ① потрачено | 5 993,50 / 9 000 | 0,67 — 67 % |
| ② прошло месяца | 14 / 31 | 0,45 — 45 % |
| ③ прогноз | 5 993,50 / 0,45 | ≈ 13 271 ₽ к концу месяца |
| ④ осталось | 9 000 − 5 993,50 | 3 006,50 ₽ |
| ⑤ в день | 3 006,50 / 18 дней | 167 ₽ (вниз до рубля — не обещаем лишнего) |
| ⑥ состояние | прогноз 13 271 > 9 000 и потрачено > 50 % | `warning` — жёлтый |

Почему в ⑥ есть условие «потрачено больше половины»: 3 сентября купили продуктов на 2 000 ₽
при лимите 28 000. Прогноз — «60 000 ₽», хотя это просто первая закупка. Пугать рано.

Функция **чистая**: ни React, ни запросов. Поэтому живёт в `lib` и легко проверяется тестом
([pace.test.ts](../../src/entities/budget/lib/pace.test.ts)).

## Часть 2. BudgetBar — полоса

```tsx
<div
  className={cx(s.bar, s[state])}                         // ok / warning / over — цвет заливки
  role="meter"
  aria-label={label}                                      // «Кафе и рестораны: потрачено 67 %»
  aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)}
  style={{ '--used': Math.min(used, 1), '--elapsed': elapsed ?? 0 }}
>
  <span className={s.fill} />
  {elapsed !== undefined && elapsed < 1 && <span className={s.today} title="Сегодня" />}
</div>
```

- `role="meter"` + `aria-value*` — скринридер прочитает «Кафе и рестораны: потрачено 67 %, 67».
  Без этого полоса для него — пустой `div`.
- Числа уходят в CSS через переменные, всё рисует CSS:

```scss
.fill  { transform: scaleX(var(--used)); transform-origin: left; transition: transform 0.6s; }
.today { left: calc(var(--elapsed) * 100%); }   // вертикальная черта «сегодня»
```

`Math.min(used, 1)` — при перерасходе (120 %) полоса не вылезает за край, она просто полная и
красная. `scaleX` вместо `width` — браузер анимирует его на видеокарте, без перерасчёта раскладки.

Как читать полосу: **заливка левее черты** — тратите медленнее, чем идёт месяц, всё хорошо.

## Часть 3. BudgetList — карточки

```tsx
export function BudgetList({ month, compact }) {
  const { data, error, isLoading, isFetching, refetch } = useGetBudgetsQuery(month)
  const { byId } = useCategoryMap()
  const [editing, setEditing] = useState<BudgetStatus | null | undefined>(undefined)
```

Обратите внимание на тип `editing` — у него **три** значения:

| `editing` | Что значит |
| --- | --- |
| `undefined` | окно закрыто |
| `null` | окно открыто, **новый** бюджет |
| объект бюджета | окно открыто, **правим** этот |

Так одна переменная описывает и «открыто ли», и «что в нём». Окно: `open={editing !== undefined}`.

```tsx
function dayOf(month) {
  const days = Number(monthRange(month).to.slice(8))         // '2026-10-31' → 31
  const day = month === currentMonth() ? new Date().getDate()  // текущий месяц — сегодняшнее число
            : month < currentMonth() ? days                    // прошлый — месяц прошёл целиком
            : 0
  return { day, days }
}
```

Для прошлых месяцев «сегодня» — последний день: месяц закончился, прогноз равен факту, а
черту «сегодня» не рисуем.

```tsx
  const sorted = [...(data ?? [])].sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  const shown = compact ? sorted.slice(0, 4) : sorted
```

Сначала самые «горящие» (по доле потраченного). На главной (`compact`) — только четыре.

`[...data]` — **копия** массива. `sort` меняет массив на месте, а `data` — это кеш RTK Query,
менять его нельзя (в режиме разработки Redux даже выдаст ошибку).

Текст под полосой выбирается по ситуации — четыре варианта:

```tsx
{pace.state === 'over'         ? <>Перерасход <Money value={-pace.left} /></>
 : month !== currentMonth()    ? <>Осталось <Money value={pace.left} /></>              // прошлый месяц: итог
 : pace.state === 'warning'    ? <>При таком темпе выйдет <Money value={pace.forecast} /> — притормозите</>
 :                               <>Можно <Money value={pace.perDay} /> в день</>}
```

Кнопки на странице «Бюджеты» (`!compact`):

```tsx
<Button onClick={() => dispatch(formOpened({ preset: { type: 'expense', categoryId: budget.categoryId } }))}>
  Добавить трату
</Button>
<Button icon={<Pencil />} aria-label={`Изменить лимит «${name}»`} onClick={() => setEditing(budget)} />
<Button icon={<Trash2 />} aria-label={`Удалить бюджет «${name}»`} onClick={() => remove(budget.categoryId)} />
```

- «Добавить трату» открывает общую форму операции **с уже выбранной категорией**.
- У кнопок-иконок `aria-label` включает название бюджета. Скринридер прочитает «Удалить бюджет
  „Кафе и рестораны“», а не шесть одинаковых «Удалить».
- Удаление оптимистичное: карточка исчезает сразу, при ошибке возвращается
  ([budget-api.ts](../../src/entities/budget/api/budget-api.ts)).

## Часть 4. BudgetFormModal — окно лимита

Маленькая форма из двух полей — та же схема, что у формы операции (страница 6), только проще:

```ts
const schema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  limit: z.string().trim().min(1, 'Введите лимит')
    .refine((v) => (parseMoney(v) ?? 0) > 0, 'Лимит должен быть больше нуля'),
})
```

```tsx
const options = categories.filter((c) =>
  c.kind === 'expense' && (c.id === budget?.categoryId || !taken.includes(c.id)))
```

В списке категорий — только расходы и только **без** бюджета (`taken` — те, у которых бюджет
уже есть). При правке своя категория остаётся в списке, а поле неактивно: менять категорию у
существующего бюджета нельзя.

## Проверьте себя

1. Лимит 10 000 ₽, 10 октября, потрачено 2 000 ₽. Какое состояние?
2. Почему `[...(data ?? [])].sort(...)`, а не `data.sort(...)`?
3. Почему у `editing` три возможных значения, а не `boolean`?

<details>
<summary>Ответы</summary>

1. `ok`: потрачено 20 %, прошло 32 % месяца. Прогноз ≈ 6 200 ₽ < 10 000 ₽.
2. `sort` меняет массив на месте, а `data` — кеш RTK Query: он заморожен, менять его нельзя.
   Плюс `data` может быть `undefined`, пока идёт загрузка.
3. Нужно знать и открыто ли окно, и что в нём: новый бюджет или правка конкретного.
   `boolean` + отдельная переменная для бюджета — два состояния, которые легко рассинхронизировать.
</details>
