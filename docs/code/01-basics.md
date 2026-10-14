# 1. Кнопка, карточка, сумма, поле

Самые маленькие детали интерфейса из [src/shared/ui](../../src/shared/ui/). Они ничего не
знают про финансы и подошли бы любому проекту — поэтому лежат в `shared`.

На них видно приёмы, которые повторяются во всём проекте. Разберитесь здесь, и дальше будет легче.

---

## Button — кнопка

[shared/ui/button.tsx](../../src/shared/ui/button.tsx)

### Где на экране

Все кнопки приложения: «+ Операция», «Добавить», «Отмена», «Повторить», иконки «изменить» и
«удалить» в строках.

### Что делает

- Рисует `<button>` в одном из четырёх стилей: главная (фиолетовая), обычная, прозрачная, опасная (красная).
- Умеет иконку слева от текста — или только иконку, тогда кнопка становится квадратной.
- Пока идёт запрос (`loading`), показывает крутилку вместо иконки и не нажимается.
- Принимает **все** обычные атрибуты кнопки: `onClick`, `type`, `aria-label`, `title`…

### Пропсы

| Проп | Тип | По умолчанию | Зачем |
| --- | --- | --- | --- |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` | стиль |
| `size` | `'sm' \| 'md'` | `'md'` | высота 32 или 40 px |
| `icon` | элемент | — | иконка слева |
| `loading` | `boolean` | — | крутилка и блокировка |
| …все атрибуты `<button>` | | | `onClick`, `type`, `disabled`, `aria-label`… |

### Как пользоваться

```tsx
<Button variant="primary" icon={<Plus />} onClick={open}>Операция</Button>
<Button type="submit" variant="primary" loading={isSaving}>Сохранить</Button>
<Button variant="ghost" size="sm" icon={<Trash2 />} aria-label="Удалить" />   {/* только иконка */}
```

### Код по частям

```tsx
export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  loading?: boolean
}
```

`ComponentProps<'button'>` — тип «все пропсы, которые понимает обычный `<button>`»: `onClick`,
`disabled`, `type`, `aria-*` и ещё сотня. `extends` значит «всё это **плюс** наши четыре
пропса». Без этой строки пришлось бы перечислять `onClick`, `title`… вручную.

```tsx
export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...props }: ButtonProps) {
```

Это **деструктуризация** пропсов: вынимаем из объекта нужные поля.

- `variant = 'secondary'` — значение по умолчанию, если проп не передали.
- `...props` («остальное») — всё, что мы **не** вынули поимённо: `onClick`, `aria-label`, `title`…
  Мы не знаем заранее, что передадут, поэтому собираем остаток в один объект.

```tsx
  return (
    <button
      type="button"
```

`type="button"` стоит **до** `{...props}`. Почему важно: у `<button>` внутри `<form>` тип по
умолчанию — `submit`, и любая кнопка, например «Отмена», отправляла бы форму. Здесь по
умолчанию `button`, а кому нужна отправка, передаёт `type="submit"`. Он попадёт в `...props`
и перезапишет значение, потому что идёт позже.

```tsx
      className={cx(s.button, s[variant], s[size], !children && s.iconOnly, className)}
```

- `s` — **CSS-модуль** (`button.module.scss`). `s.button` — не строка `'button'`, а
  уникальное имя вроде `_button_aynoc_1`. Так классы разных компонентов не пересекаются.
- `s[variant]` — если `variant = 'primary'`, получим класс `s.primary`.
- `!children && s.iconOnly` — нет текста → добавить класс «квадратная кнопка». Если текст
  есть, выражение даёт `false`.
- `cx(...)` — склеивает классы через пробел и выбрасывает `false`/`undefined`
  ([shared/lib/cx.ts](../../src/shared/lib/cx.ts), одна строка кода).
- `className` в конце — снаружи можно добавить свой класс.

```tsx
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
```

- Кнопка неактивна, если её отключили **или** идёт загрузка: двойная отправка невозможна.
- `aria-busy` — подсказка скринридеру «идёт процесс». `|| undefined` нужно, чтобы при
  `loading = false` атрибута не было вовсе, а не `aria-busy="false"`.
- `{...props}` — разложить «остальное» как атрибуты: `onClick`, `aria-label` и т. д.

```tsx
      {loading ? <span className={s.spinner} aria-hidden /> : icon}
      {children}
    </button>
```

Пока грузится — крутилка вместо иконки, текст остаётся на месте, поэтому ширина кнопки не прыгает.
`aria-hidden` — крутилка декоративная, скринридеру читать её не нужно.

### Что будет, если…

- **убрать `type="button"`** — «Отмена» в форме операции начнёт отправлять форму;
- **поставить `{...props}` перед `type="button"`** — `type="submit"` снаружи перестанет работать: его перезапишет;
- **убрать `|| loading` из `disabled`** — при медленной сети можно нажать «Добавить» дважды и создать две операции.

---

## Card — карточка

[shared/ui/card.tsx](../../src/shared/ui/card.tsx)

### Что делает

Белый (в тёмной теме — тёмный) блок со скруглением и тенью. Может иметь заголовок и что-то
справа от него — ссылку «Все», кнопку «+ Бюджет».

```tsx
<Card title="Бюджеты" action={<Link to="/budgets">Все</Link>}>
  …содержимое…
</Card>
```

### Код

```tsx
interface CardProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: ReactNode
  action?: ReactNode
}
```

`Omit<…, 'title'>` — «все пропсы `<section>`, **кроме** `title`». У HTML-элемента уже есть
атрибут `title` (всплывающая подсказка, строка), а нам нужен `title` — заголовок, любой
элемент. `Omit` убирает конфликт типов.

```tsx
export function Card({ title, action, className, children, ...props }: CardProps) {
  return (
    <section className={cx(s.card, className)} {...props}>
      {(title || action) && (
        <header className={s.header}>
          {title && <h2 className={s.title}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
```

- `<section>` — смысловой блок страницы. Скринридер показывает такие блоки в навигации.
- `{(title || action) && (…)}` — шапку рисуем, только если есть что в ней показать.
- `<h2>` — заголовок второго уровня (`<h1>` — заголовок страницы, он в `PageHeader`).
  Правильная иерархия заголовков позволяет быстро прыгать по странице скринридером.

В CSS карточки есть важная строка ([урок 17](../lessons.md)):

```scss
grid-template-columns: minmax(0, 1fr);
```

Без неё длинная строка без переносов (сумма «1 234 567 ₽») растягивала карточку шире экрана телефона.

---

## Money — сумма

[shared/ui/money.tsx](../../src/shared/ui/money.tsx)

### Что делает

Получает копейки, показывает рубли: «1 250,50 ₽». Умеет знак «+», цвет и отбрасывание нулевых копеек.

```tsx
<Money value={125050} />                      // 1 250,50 ₽
<Money value={120000} trim />                 // 1 200 ₽
<Money value={5000} sign tone="income" />     // +50,00 ₽ зелёным
<Money value={-3000} tone="auto" />           // −30,00 ₽ красным (auto: по знаку)
```

### Код

```tsx
interface MoneyProps extends FormatMoneyOptions {
  value: number
  tone?: 'income' | 'expense' | 'muted' | 'auto'
  className?: string
}
```

`extends FormatMoneyOptions` — пропсы `sign`, `trim`, `compact`, `bare` берутся прямо из опций
функции `formatMoney`. Добавят в функцию новую опцию — она сама появится у компонента.

```tsx
export function Money({ value, tone, className, ...options }: MoneyProps) {
  const resolved = tone === 'auto' ? (value > 0 ? 'income' : value < 0 ? 'expense' : undefined) : tone
```

`tone="auto"` превращается в настоящий тон по знаку: плюс → зелёный, минус → красный, ноль → без цвета.

```tsx
  return <span className={cx(s.money, resolved && s[resolved], className)}>{formatMoney(value, options)}</span>
}
```

`...options` (всё, кроме `value`, `tone`, `className`) уходит прямо в `formatMoney`.
В CSS у `.money` есть `font-variant-numeric: tabular-nums` — все цифры одной ширины, и суммы
в столбик стоят ровно.

---

## Field — подпись + поле + ошибка

[shared/ui/field.tsx](../../src/shared/ui/field.tsx)

### Где на экране

Каждое поле в формах: «Сумма», «Дата», «Заметка», «Лимит в месяц».

### Что делает

- Рисует подпись над полем и ошибку (или подсказку) под ним.
- **Связывает** их с полем, чтобы скринридер прочитал: «Сумма, недопустимое значение, Введите сумму».
- Клик по подписи ставит курсор в поле.

### Как пользоваться — необычный способ

```tsx
<Field label="Сумма" error={errors.amount?.message} hint="Например, 1 250,50">
  {(a11y) => <Input {...a11y} {...register('amount')} />}
</Field>
```

Вместо обычных детей (`<Field><Input/></Field>`) — **функция**. Этот приём называется
«render prop». Почему: `Field` должен передать полю `id` и aria-атрибуты, а поле создаёте вы.
Функция получает их и раскладывает: `{...a11y}`.

### Код

```tsx
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
```

`useId()` — хук React, который даёт **уникальный** id вроде `:r3:`. Он одинаков при каждой
перерисовке и не совпадает с id других полей. Писать `id="amount"` руками опасно: две формы на
странице — два одинаковых id.

```tsx
      <label htmlFor={id} className={s.label}>{label}</label>
```

`htmlFor` — то же, что `for` в HTML: подпись принадлежит полю с этим id.

```tsx
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })}
```

Вызываем функцию-ребёнка и передаём ей:
- `id` — чтобы `htmlFor` нашёл поле;
- `aria-invalid` — «в поле ошибка» (рамка красная — CSS смотрит на этот атрибут);
- `aria-describedby` — «пояснение к полю лежит в элементе с id `…-message`».

```tsx
      {error ? (
        <p id={messageId} className={s.error} role="alert">{error}</p>
      ) : (
        hint && <p id={messageId} className={s.hint}>{hint}</p>
      )}
```

Под полем либо ошибка, либо подсказка — у обеих тот же `messageId`. `role="alert"` — новую
ошибку скринридер зачитает сразу, не дожидаясь, пока человек вернётся к полю.

### Input, Select, Textarea

```tsx
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(s.control, className)} {...props} />
}
```

Обычный `<input>` с нашим классом. Всё остальное проходит насквозь — в том числе `ref`,
который нужен `register()` из react-hook-form. В React 19 `ref` — обычный проп, поэтому
`forwardRef` больше не нужен.

---

## Skeleton, EmptyState, ErrorState — три состояния данных

[shared/ui/states.tsx](../../src/shared/ui/states.tsx)

У любого блока с данными с сервера есть четыре состояния, и каждое нужно нарисовать:

| Состояние | Что показываем | Компонент |
| --- | --- | --- |
| грузится | серые «болванки» размером с будущее содержимое | `Skeleton` |
| ошибка | иконка, текст, кнопка «Повторить» | `ErrorState` |
| пусто | иконка, «Ничего не нашлось», кнопка действия | `EmptyState` |
| есть данные | сами данные | — |

```tsx
if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} retrying={isFetching} />
if (isLoading) return <Skeleton height={48} />
if (!data.items.length) return <EmptyState title="Ничего не нашлось" />
return <List items={data.items} />
```

**Почему скелетон, а не крутилка:** крутилка маленькая, а потом страница «прыгает», когда
появляются данные. Скелетон того же размера, что и данные, поэтому ничего не сдвигается.

```tsx
export function ErrorState({ message, onRetry, retrying }) {
  return (
    <div className={s.state} role="alert">
      …
      {onRetry && (
        <Button size="sm" onClick={onRetry} loading={retrying}>Повторить</Button>
      )}
```

`loading={retrying}` — пока идёт повторный запрос, на кнопке крутится колёсико. Человек видит,
что нажатие сработало. В «Прилавке» без этого жаловались, что «Повторить» не работает: на
самом деле работало, но этого не было видно.

---

## Проверьте себя

1. Почему у `Button` пропсы — это `ComponentProps<'button'>` плюс свои, а не только свои?
2. Что случится с двумя формами на странице, если в `Field` вместо `useId()` написать `id={label}`?
3. Почему `Field` принимает функцию, а не обычный `<Input>`?
4. Откройте [демо](https://dmitriy9427.github.io/saldo/), в консоли выполните
   `__saldo.controls.fail = true` и переключите месяц на главной. Какие компоненты этой
   страницы вы увидите?

<details>
<summary>Ответы</summary>

1. Чтобы снаружи можно было передать любой атрибут кнопки (`onClick`, `aria-label`, `title`,
   `form`…) без изменений в компоненте.
2. Если в обеих формах есть поле «Сумма», у них будет одинаковый `id`. Клик по второй подписи
   поставит курсор в **первое** поле, а скринридер прочитает чужую ошибку.
3. `Field` создаёт `id` и aria-атрибуты, а поле создаёт форма (в нём `register`). Функция —
   способ передать атрибуты в элемент, который создаёт кто-то другой.
4. `ErrorState` в каждой карточке, с кнопкой «Повторить» (это `Button` с `loading`).
   Вернуть обратно: `__saldo.controls.fail = false`.
</details>
