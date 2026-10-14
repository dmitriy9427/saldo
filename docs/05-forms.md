# 05. Формы — с нуля

## Зачем библиотеки для форм

Форма на голом React — это `useState` на каждое поле, `onChange` на каждое поле, своя проверка
и свой вывод ошибок:

```tsx
const [amount, setAmount] = useState('')
const [amountError, setAmountError] = useState('')
const [category, setCategory] = useState('')
const [categoryError, setCategoryError] = useState('')
// …и так на каждое поле, плюс перерисовка всей формы на каждую букву
```

Две библиотеки делят работу так:

- **react-hook-form** — **хранит** значения полей, следит за отправкой и ошибками, не
  перерисовывает всю форму на каждую букву;
- **zod** — **описывает правила**: «сумма — обязательна и больше нуля». Одна схема даёт и
  проверку, и тип TypeScript.

## Самый маленький пример

```tsx
const schema = z.object({
  name: z.string().min(1, 'Введите имя'),
  age: z.coerce.number().min(18, 'Только с 18 лет'),
})
type Values = z.infer<typeof schema>     // { name: string; age: number } — тип из схемы

function Signup() {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),       // «проверяй этой схемой»
  })
  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <input {...register('name')} />    {/* register подключает поле к форме */}
      {errors.name && <p>{errors.name.message}</p>}
      <input {...register('age')} />
      {errors.age && <p>{errors.age.message}</p>}
      <button>Отправить</button>
    </form>
  )
}
```

- `register('name')` возвращает `{ name, onChange, onBlur, ref }`. Пробрасываем в `<input>`, и
  форма сама читает значение.
- `handleSubmit(fn)` сначала проверяет схемой. Если есть ошибки — заполняет `errors`, а `fn`
  **не вызывается**. Если всё хорошо — вызывает `fn` с проверенными значениями.

## Форма операции в «Сальдо»

[features/transaction-form](../src/features/transaction-form/): схема в
`model/schema.ts`, компонент в `ui/transaction-form.tsx`.

### Решение 1: сумма — строка

Хочется хранить сумму числом. Но человек вводит её по буквам:

| Ввёл | `Number(...)` | Что случится, если хранить число |
| --- | --- | --- |
| `1` | 1 | ок |
| `12,` | NaN | поле сломалось |
| `12,5` | NaN | запятая — не точка для JS |
| `0,0` | 0 | «съели» запятую, пользователь не может ввести 0,05 |

Поэтому в форме сумма — **строка как есть**, а в копейки превращается только при отправке:

```ts
amount: z.string().trim()
  .min(1, 'Введите сумму')
  .refine((v) => !v || parseMoney(v) !== null, 'Не похоже на сумму')
  .refine((v) => (parseMoney(v) ?? 1) > 0, 'Сумма должна быть больше нуля'),
```

`refine(проверка, сообщение)` — своё правило. Проверки идут по очереди, и под полем
показывается первая ошибка. Хитрость `?? 1` во второй проверке: если сумма не распознана,
об этом уже скажет первая проверка, и вторая не добавляет ещё одну ошибку ([урок 6](lessons.md)).

А превращение в копейки — в отдельной функции:

```ts
export function toInput(values: TransactionFormValues): TransactionInput {
  return {
    amount: parseMoney(values.amount)!,      // «1 250,50» → 125050
    categoryId: values.type === 'transfer' ? null : values.categoryId,
    // …
  }
}
```

### Решение 2: правила на несколько полей

«Для перевода нужен второй счёт, и он не должен совпадать с первым» — такое правило смотрит
на **несколько** полей сразу. Для этого `superRefine` на всю схему:

```ts
.superRefine((v, ctx) => {
  if (v.type === 'transfer') {
    if (!v.toAccountId)
      ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Куда перевести?' })
    else if (v.toAccountId === v.accountId)
      ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Выберите другой счёт' })
  } else if (!v.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Выберите категорию' })
  }
})
```

`path: ['toAccountId']` — под каким полем показать ошибку.

### Решение 3: когда показывать ошибки

```ts
useForm({ mode: 'onSubmit', reValidateMode: 'onChange' })
```

| Момент | Что видит человек |
| --- | --- |
| печатает впервые | никаких красных надписей: ещё не закончил |
| нажал «Добавить» с ошибкой | ошибки под полями |
| исправляет поле | ошибка исчезает **сразу**, на каждую букву |

### Решение 4: ошибки сервера — под теми же полями

Сервер проверяет всё ещё раз, ведь запрос можно отправить в обход формы. Если ему что-то не
нравится, он отвечает так:

```json
HTTP 422
{ "message": "Проверьте поля", "fields": { "note": "Не длиннее 200 символов" } }
```

Форма показывает это так же, как свои ошибки:

```ts
try {
  await create(input).unwrap()
} catch (error) {
  const fields = fieldErrors(error)                         // { note: '…' } или {}
  const known = FIELDS.filter((name) => fields[name])
  known.forEach((name) => setError(name, { message: fields[name] }))  // под поле
  if (!known.length) setError('root', { message: errorMessage(error) }) // общая ошибка
}
```

Тест [transaction-form.test.tsx](../src/features/transaction-form/ui/transaction-form.test.tsx)
подменяет ответ сервера на 422 и проверяет, что текст появился под полем.

### Решение 5: следить только за нужными полями

Под суммой показывается подсказка «1 250,50 ₽», а при смене типа «Расход → Перевод» меняются
поля. Для этого нужно знать текущие значения:

```ts
const [type, amount, date] = useWatch({ control, name: ['type', 'amount', 'date'] })
```

`useWatch` подписывается **только** на эти поля: печатаете заметку — форма не перерисовывается.

### Решение 6: нестандартные поля — через Controller

`register` подходит для `<input>` и `<select>`. Переключатель «Расход / Доход / Перевод» и
чипы категорий — свои компоненты, у них нет `ref` и обычного `onChange`. Для них есть `Controller`:

```tsx
<Controller
  control={control}
  name="type"
  render={({ field }) => (
    <Segmented value={field.value} onChange={field.onChange} options={TYPES} label="Тип операции" />
  )}
/>
```

## Доступность: форма для всех

Обёртка [Field](../src/shared/ui/field.tsx) связывает подпись, поле и ошибку:

```tsx
<label htmlFor={id}>Сумма</label>
<input id={id} aria-invalid="true" aria-describedby={`${id}-message`} />
<p id={`${id}-message`} role="alert">Введите сумму</p>
```

Скринридер прочитает: «Сумма, поле ввода, недопустимое значение, Введите сумму».

- `htmlFor` + `id` — клик по подписи ставит курсор в поле;
- `aria-invalid` — «в поле ошибка»;
- `aria-describedby` — «вот пояснение к полю»;
- `role="alert"` — новая ошибка зачитывается сразу.

## Ошибки

> **Поле есть в форме, но нет в схеме** — zod его выбросит, и при отправке значения не будет.
>
> **`z.number()` для `<input>`** — из поля всегда приходит строка. Используйте
> `z.coerce.number()` или храните строкой, как сумму здесь.
>
> **`defaultValues` поменялись, а форма нет** — `useForm` читает их один раз при создании.
> Для другой операции нужен новый экземпляр формы: в «Сальдо» это `key={editing?.id ?? 'new'}`.

## Попробуйте сами

1. Добавьте правило: дата не может быть в будущем. Куда — в поле `date` или в `superRefine`?
2. Почему у заметки нет `refine`, а у суммы два?
3. Отправьте пустую форму и посмотрите в DevTools → Elements на поле суммы. Какие атрибуты появились?

<details>
<summary>Ответы</summary>

1. В поле — правилу нужно только одно поле:
   ```ts
   date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Выберите дату')
     .refine((v) => v <= today(), 'Дата в будущем'),
   ```
   Даты строками `YYYY-MM-DD` сравниваются как строки (глава 06).
2. Заметка необязательна, у неё одно ограничение — длина: `z.string().max(200, …)`.
3. `aria-invalid="true"` и `aria-describedby="…-message"`.
</details>
