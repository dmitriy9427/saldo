# 3. Переключатель вариантов

[shared/ui/segmented.tsx](../../src/shared/ui/segmented.tsx)

## Где на экране

«Расход / Доход / Перевод» в форме операции, «Все / Расходы / Доходы / Переводы» в фильтрах.
Выбранный вариант подсвечен «пилюлей», которая плавно переезжает при переключении.

## Что делает

- Показывает несколько вариантов, выбран всегда ровно один.
- С клавиатуры: Tab заходит в группу **один раз**, стрелки ← → переключают варианты.
- Для скринридера это группа радиокнопок: «Тип операции, переключатель, Расход, выбрано, 1 из 3».

## Пропсы

| Проп | Тип | Зачем |
| --- | --- | --- |
| `value` | `T` | выбранный вариант |
| `onChange` | `(value: T) => void` | выбрали другой |
| `options` | `{ value: T; label: string }[]` | варианты |
| `label` | `string` | название группы для скринридера |
| `size` | `'sm' \| 'md'` | высота |

## Как пользоваться

```tsx
const [type, setType] = useState<'expense' | 'income'>('expense')

<Segmented
  label="Тип операции"
  value={type}
  onChange={setType}                      // TypeScript знает: сюда придёт 'expense' | 'income'
  options={[
    { value: 'expense', label: 'Расход' },
    { value: 'income', label: 'Доход' },
  ]}
/>
```

## Дженерик `<T extends string>`

```tsx
interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}
export function Segmented<T extends string>(props: SegmentedProps<T>) { … }
```

`T` — «какой-то строковый тип, который определится при использовании». Передали варианты
`'expense' | 'income'` — и `onChange` получит именно этот тип, а не просто `string`. Если
кто-то по ошибке передаст `value="other"`, TypeScript подчеркнёт это красным.

Без дженерика пришлось бы писать `onChange: (value: string) => void`, а потом в каждом
месте приводить тип вручную: `setType(value as 'expense' | 'income')`.

## Код по частям

```tsx
  const index = options.findIndex((o) => o.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(s.root, s[size])}
      style={{ '--count': options.length, '--index': index } as CSSProperties}
```

- `role="radiogroup"` + `aria-label` — скринридер узнает, что это группа выбора, и прочитает её название.
- `style={{ '--count': 3, '--index': 1 }}` — передаём в CSS **числа** через CSS-переменные.
  Пилюля в CSS двигается так:

```scss
.thumb {
  width: calc((100% - 6px) / var(--count));    // ширина = одна доля из трёх
  translate: calc(100% * var(--index)) 0;      // сдвиг = номер × своя ширина
  transition: translate 0.25s;                 // плавно
}
```

Выбрали второй вариант → `--index: 1` → пилюля сдвинулась на одну свою ширину. JavaScript не
считает ни одного пикселя, всё делает CSS.

```tsx
      onKeyDown={(event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
        if (!step) return
```

Объект как таблица соответствий: нажали →, получили `1`; нажали «Б», получили `undefined` и вышли.
Так короче, чем четыре `if`.

```tsx
        event.preventDefault()
        const next = options[(index + step + options.length) % options.length]!
        onChange(next.value)
```

- `preventDefault()` — стрелка ↓ не должна прокручивать страницу.
- `(index + step + length) % length` — переход **по кругу**. Пример для трёх вариантов:
  на последнем (2) нажали → : `(2 + 1 + 3) % 3 = 0`, первый вариант; на первом (0) нажали ← :
  `(0 − 1 + 3) % 3 = 2`, последний. `+ length` нужен, чтобы не получить отрицательное число.

```tsx
        requestAnimationFrame(() =>
          event.currentTarget.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
        )
```

После `onChange` React перерисует кнопки: выбранной станет другая. Фокус должен переехать на
неё. Но перерисовка случится **после** этого обработчика, поэтому ждём следующий кадр
(`requestAnimationFrame`) и тогда ищем выбранную кнопку.

```tsx
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
```

**«Бегающий tabindex»** (roving tabindex):
- `tabIndex={0}` — на эту кнопку можно попасть клавишей Tab;
- `tabIndex={-1}` — нельзя, только стрелками или кликом.

Выбранная кнопка — `0`, остальные — `-1`. Поэтому Tab заходит в группу один раз, на выбранный
вариант, и следующий Tab уходит **из группы** дальше, а не по всем вариантам подряд. Так
работают стандартные радиокнопки в браузере.

## Что будет, если…

- **у всех кнопок `tabIndex={0}`** — чтобы пройти фильтры, придётся нажать Tab четыре раза
  только на переключателе типов;
- **убрать `requestAnimationFrame`** — стрелка переключит вариант, но фокус останется на старой кнопке;
- **убрать `event.preventDefault()`** — стрелка ↓ в переключателе заодно прокрутит страницу.

## Проверьте себя

1. Сколько раз нужно нажать Tab, чтобы пройти переключатель «Все / Расходы / Доходы / Переводы»?
2. Как пилюля узнаёт, куда ехать, если JavaScript не считает пиксели?

<details>
<summary>Ответы</summary>

1. Один: заходим на выбранный вариант, следующий Tab уводит из группы.
2. Из CSS-переменных `--count` и `--index`: ширина — `100% / count`, сдвиг — `100% × index`.
</details>
