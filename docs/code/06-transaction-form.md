# 6. Форма операции

Папка [features/transaction-form](../../src/features/transaction-form/):

| Файл | Что внутри |
| --- | --- |
| `model/form-slice.ts` | открыта ли форма, какую операцию правим |
| `model/schema.ts` | правила полей (zod) и перевод «форма ↔ сервер» |
| `ui/transaction-form.tsx` | сам компонент: модалка + форма |
| `index.ts` | что можно брать снаружи |

Идеи react-hook-form и zod объяснены в [главе 05](../05-forms.md). Здесь — сам компонент,
сверху вниз.

## Где на экране

Окно «Новая операция»: переключатель «Расход / Доход / Перевод», большое поле суммы с ₽,
чипы категорий с иконками, счёт и дата («Сегодня», «Вчера»), заметка, кнопки «Отмена» и «Добавить».

## Что делает

- Открывается кнопкой «+ Операция», клавишей N, кнопкой «+» на телефоне, кликом по строке
  (тогда это «Правка операции» с заполненными полями) и кнопкой «Добавить трату» в бюджете
  (с уже выбранной категорией).
- Проверяет поля и показывает ошибки под ними.
- Отправляет на сервер, показывает тост, закрывается.
- Если сервер отказал (422), показывает его ошибки под нужными полями.

---

## Часть 1. Как форма открывается — слайс

Форма одна на всё приложение, а открыть её нужно из пяти мест. Поэтому «открыта ли» хранится
в Redux ([form-slice.ts](../../src/features/transaction-form/model/form-slice.ts)):

```ts
interface FormState {
  open: boolean
  editing: Transaction | null                  // правим эту; null — новая
  preset: Partial<TransactionFormValues>       // заранее заполнить: категория из бюджета
}

reducers: {
  formOpened: (state, action) => {
    state.open = true
    state.editing = action.payload?.editing ?? null
    state.preset = action.payload?.preset ?? {}
  },
  formClosed: (state) => { state.open = false },
}
```

Откуда открывают:

```tsx
dispatch(formOpened())                                                   // новая
dispatch(formOpened({ editing: transaction }))                           // правка
dispatch(formOpened({ preset: { type: 'expense', categoryId: 'cafe' } })) // из бюджета «Кафе»
```

В `editing` кладётся **вся операция**, а не только id: форма заполняется мгновенно, без
запроса к серверу. Данные уже есть в списке.

## Часть 2. Обёртка-модалка

```tsx
export function TransactionFormModal() {
  const { open, editing } = useAppSelector(selectForm)
  const dispatch = useAppDispatch()
  return (
    <Modal open={open} onClose={() => dispatch(formClosed())}
           title={editing ? 'Правка операции' : 'Новая операция'}>
      {open && <TransactionForm key={editing?.id ?? 'new'} />}
    </Modal>
  )
}
```

Её монтирует каркас приложения (`AppShell`) один раз. Две важные детали:

**`{open && …}`** — форма создаётся заново при каждом открытии. Закрыли с ошибками —
открыли чистую.

**`key={editing?.id ?? 'new'}`** — подсказка React: «если ключ поменялся, это **другой**
компонент, выброси старый и создай новый». Зачем: `useForm` читает `defaultValues` **один раз**
при создании. Открыли правку операции A, потом сразу операции B. Без смены ключа форма
осталась бы с данными A.

## Часть 3. Данные для формы

```tsx
function TransactionForm() {
  const { editing, preset } = useAppSelector(selectForm)
  const dispatch = useAppDispatch()
  const { data: accounts = [] } = useGetAccountsQuery()        // счета для выпадающего списка
  const { categories } = useCategoryMap()                     // категории для чипов
  const [create, createState] = useCreateTransactionMutation()
  const [update, updateState] = useUpdateTransactionMutation()
  const saving = createState.isLoading || updateState.isLoading
```

- `data: accounts = []` — пока счета не загрузились, пустой массив вместо `undefined`. Код
  ниже может спокойно делать `accounts.map(...)`.
- Хук мутации возвращает пару: **функцию** (`create`) и **состояние** (`createState.isLoading`…).
  Похоже на `useState`: `[значение, сеттер]`.
- `saving` — для крутилки на кнопке «Добавить».

## Часть 4. Создание формы

```tsx
  const { register, control, handleSubmit, setValue, getValues, setError, formState: { errors } } =
    useForm<TransactionFormValues>({
      resolver: zodResolver(transactionFormSchema),
      defaultValues: toFormValues(editing, preset),
      mode: 'onSubmit',
      reValidateMode: 'onChange',
    })
```

| Что получили | Зачем |
| --- | --- |
| `register` | подключить обычный `<input>`/`<select>` |
| `control` | подключить свой компонент через `Controller` и следить за полями через `useWatch` |
| `handleSubmit` | обёртка для `onSubmit`: сначала проверка, потом ваша функция |
| `setValue` / `getValues` | поменять или прочитать поле из кода |
| `setError` | поставить ошибку руками (ошибки с сервера) |
| `errors` | текущие ошибки: `errors.amount?.message` |

`toFormValues(editing, preset)` готовит начальные значения:
- правка → значения операции (сумма `125050` превращается в строку `'1250,5'`);
- новая → пустые поля, сегодняшняя дата, основная карта, и поверх — `preset`.

## Часть 5. Следим за нужными полями

```tsx
  const [type, amount, date] = useWatch({ control, name: ['type', 'amount', 'date'] })
  const kind = type === 'income' ? 'income' : 'expense'
  const visibleCategories = categories.filter((c) => c.kind === kind)
```

От трёх полей зависит **вид** формы:
- `type` — показывать категории или «Откуда / Куда»; какие категории показывать (расходы или доходы);
- `amount` — подсказка «1 250,50 ₽» под полем;
- `date` — какая из ссылок «Сегодня / Вчера» активна.

Печатаете заметку — `useWatch` её не слушает, перерисовки нет.

```tsx
  useEffect(() => {
    const current = categories.find((c) => c.id === getValues('categoryId'))
    if (current && current.kind !== kind) setValue('categoryId', '')
  }, [kind, categories, getValues, setValue])
```

Выбрали «Кафе» (расход), потом переключили на «Доход» — «Кафе» больше не подходит, сбрасываем
выбор. Иначе пользователь отправил бы доход с категорией расходов, и сервер вернул бы 422.

## Часть 6. Отправка

```tsx
  async function onSubmit(values: TransactionFormValues) {
    const input = toInput(values)                     // ① строки → копейки, лишнее → null
    try {
      if (editing) await update({ id: editing.id, patch: input }).unwrap()   // ② правка
      else await create(input).unwrap()                                      //   или создание
      dispatch(toastShown({ message: editing ? 'Изменения сохранены'
        : `Добавлено: ${formatMoney(input.amount, { trim: true })}` }))       // ③ тост
      dispatch(formClosed())                                                 // ④ закрыть
    } catch (error) {
      const fields = fieldErrors(error)                                      // ⑤ ошибки сервера
      const known = FIELDS.filter((name) => fields[name])
      known.forEach((name) => setError(name, { message: fields[name] }))
      if (!known.length) setError('root', { message: errorMessage(error) })
    }
  }
```

`onSubmit` вызывается, **только если zod пропустил** все поля: `handleSubmit(onSubmit)` сначала
проверяет схемой.

- ② `.unwrap()` превращает ответ с ошибкой в исключение, и мы попадаем в `catch`.
- ⑤ Сервер ответил `422 { fields: { note: '…' } }`. Для каждого знакомого поля ставим
  ошибку под ним. Незнакомое поле или ошибка без полей (нет сети, 500) — общая ошибка
  `root` над кнопками.
- После успеха ничего обновлять руками не нужно: мутация инвалидировала теги, и список,
  счета, графики перезапросились сами ([глава 03](../03-rtk-query.md#теги--как-rtk-query-понимает-что-перезапросить)).

## Часть 7. Разметка: поле за полем

В примерах ниже убраны некоторые классы и атрибуты, чтобы было видно главное. Полный код — в файле.

```tsx
  return (
    <form className={s.form} onSubmit={handleSubmit(onSubmit)} noValidate>
```

`noValidate` выключает встроенные всплывающие подсказки браузера («Заполните это поле»): у нас
свои, красивее и на русском.

**Тип операции** — свой компонент, поэтому через `Controller`:

```tsx
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Segmented label="Тип операции" value={field.value} onChange={field.onChange} options={TYPES} />
        )}
      />
```

`Controller` даёт `field` со значением и функцией изменения, а мы подключаем их к `Segmented`.

**Сумма** — обычный input через `register`:

```tsx
      <Field label="Сумма" error={errors.amount?.message}
             hint={parsed && parsed > 0 ? formatMoney(parsed) : 'Например, 1 250,50'}>
        {(a11y) => (
          <div className={s.amount}>
            <Input {...a11y} {...register('amount')} inputMode="decimal" autoComplete="off"
                   placeholder="0" data-autofocus className={s.amountInput} />
            <span className={s.currency}>₽</span>
          </div>
        )}
      </Field>
```

- `{...a11y}` от `Field` — id и aria-атрибуты; `{...register('amount')}` от формы — name,
  onChange, ref. Обе пачки ложатся на один `<input>`.
- `inputMode="decimal"` — на телефоне откроется цифровая клавиатура с запятой.
- `autoComplete="off"` — браузер не будет предлагать «прошлые суммы».
- `data-autofocus` — сюда `Modal` поставит курсор ([страница 2](02-modal.md)).
- Подсказка под полем показывает, **как поняла форма** введённое: ввели «1250,5» — видим
  «1 250,50 ₽». Ошибки в формате видны сразу.

**Категория или «Откуда / Куда»:**

```tsx
      {type === 'transfer' ? (
        <div className={s.row}>
          <Field label="Откуда">…<Select {...register('accountId')}>…</Select></Field>
          <Field label="Куда">…<Select {...register('toAccountId')}>…</Select></Field>
        </div>
      ) : (
        <fieldset className={s.categories}>
          <legend className={s.legend}>Категория</legend>
          <Controller control={control} name="categoryId" render={({ field }) => (
            <div className={s.chips} role="radiogroup" aria-label="Категория">
              {visibleCategories.map((c) => (
                <label key={c.id} className={cx(s.chip, field.value === c.id && s.selected)}>
                  <input type="radio" name={field.name} value={c.id}
                         checked={field.value === c.id} onChange={() => field.onChange(c.id)}
                         className={s.radio} />
                  <CategoryIcon category={c} size="sm" />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          )} />
        </fieldset>
      )}
```

Чипы категорий — это **настоящие радиокнопки**, спрятанные визуально (`className={s.radio}`),
внутри `<label>`. Клик по любому месту чипа отмечает радиокнопку: так работает `<label>`. Почему
не `<div onClick>`: радиокнопки бесплатно дают управление стрелками и правильное чтение
скринридером («Кафе и рестораны, переключатель, 2 из 12»).

`<fieldset>` + `<legend>` — HTML-способ сказать «эти поля — одна группа, и вот её название».

**Дата и быстрые ссылки:**

```tsx
      <Field label="Дата" error={errors.date?.message} hint={
        <span className={s.quick}>
          <button type="button" onClick={() => setValue('date', today(), { shouldValidate: true })}>Сегодня</button>
          <button type="button" onClick={() => setValue('date', yesterday(), { shouldValidate: true })}>Вчера</button>
        </span>
      }>
        {(a11y) => <Input {...a11y} {...register('date')} type="date" max={today()} />}
      </Field>
```

- `setValue(поле, значение, { shouldValidate: true })` — поменять поле из кода и сразу
  проверить (если была ошибка «Выберите дату», она исчезнет).
- `type="button"` — иначе кнопки внутри формы отправили бы её.
- `max={today()}` — в календаре нельзя выбрать будущий день.

**Кнопки:**

```tsx
      {errors.root && <p className={s.error} role="alert">{errors.root.message}</p>}
      <div className={s.footer}>
        <Button onClick={() => dispatch(formClosed())}>Отмена</Button>
        <Button type="submit" variant="primary" loading={saving}>{editing ? 'Сохранить' : 'Добавить'}</Button>
      </div>
    </form>
```

`loading={saving}` — пока идёт запрос, на кнопке крутилка, повторное нажатие невозможно.

## Что будет, если…

- **убрать `key` у `TransactionForm`** — откройте правку одной операции, закройте, откройте
  другую: поля могут остаться от первой (если окно не успело размонтироваться);
- **заменить `useWatch` на `watch()`** — форма станет перерисовываться на каждую букву в любом поле;
- **убрать эффект сброса категории** — выберите «Кафе», переключите на «Доход» и отправьте:
  придёт ошибка сервера «Это категория расходов»;
- **убрать `noValidate`** — при пустой сумме браузер покажет свою подсказку поверх нашей.

## Проверьте себя

1. Откуда форма знает, что открыта для правки, а не для создания?
2. Почему тип операции подключён через `Controller`, а сумма — через `register`?
3. Сервер вернул `422 { fields: { amount: '…', foo: '…' } }`. Что увидит пользователь?
4. Найдите в коде, откуда открывается форма с заранее выбранной категорией.

<details>
<summary>Ответы</summary>

1. Из слайса: `editing` не `null`. Его кладёт `formOpened({ editing: t })` при клике по строке.
2. `register` работает с обычными `<input>`/`<select>`: ему нужен `ref` и событие `onChange`
   с `event.target.value`. `Segmented` — свой компонент, у него `onChange(value)`, поэтому
   `Controller`.
3. Ошибку под полем «Сумма». `foo` форма не знает, но раз одно знакомое поле нашлось, общая
   ошибка `root` не ставится.
4. [budget-list.tsx](../../src/widgets/budget-list/ui/budget-list.tsx), кнопка «Добавить трату»:
   `formOpened({ preset: { type: 'expense', categoryId: budget.categoryId } })`.
</details>
