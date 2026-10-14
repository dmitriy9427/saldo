# 07. Графики — с нуля

## Recharts за одну минуту

Recharts рисует графики из обычных React-компонентов: вы описываете **что** нарисовать, а
SVG-элементы он создаёт сам.

```tsx
const data = [
  { month: 'сен', income: 120000, expense: 90000 },
  { month: 'окт', income: 110000, expense: 95000 },
]

<BarChart responsive style={{ width: '100%', height: 280 }} data={data}>
  <XAxis dataKey="month" />          {/* подписи снизу — из поля month */}
  <YAxis />                          {/* шкала слева — посчитается сама */}
  <Tooltip />                        {/* подсказка при наведении */}
  <Bar dataKey="income" fill="green" />   {/* столбики из поля income */}
  <Bar dataKey="expense" fill="red" />
</BarChart>
```

- `data` — массив объектов, каждый объект — одна точка (месяц);
- `dataKey` — какое поле объекта брать;
- `responsive` (новое в Recharts 3) — график растягивается по ширине контейнера. Раньше
  нужна была обёртка `<ResponsiveContainer>`.

## Цвета из темы

Хочется написать `fill="var(--income)"`, чтобы цвет брался из CSS-переменной темы. Но в
атрибутах SVG переменные работают не во всех браузерах. Обходной путь:

```tsx
<Bar dataKey="income" fill="currentColor" className={s.income} />
```

```scss
.income { color: var(--income); }   // currentColor = цвет текста этого элемента
```

`currentColor` — «цвет текста», а цвет текста задаём классом из CSS-переменной. Переключили
тему — поменялась переменная — график перекрасился **без перерисовки** в React.

## Свои столбики — проп shape

В «Сальдо» выбранный месяц яркий, остальные бледные. Стандартный столбик так не умеет, но
можно передать свой ([cashflow-chart.tsx](../src/widgets/cashflow-chart/ui/cashflow-chart.tsx)):

```tsx
<Bar
  dataKey="income"
  shape={(props) => <Column {...props} selected={props.payload.month === month} />}
/>

function Column({ x, y, width, height, selected }) {
  // Путь SVG: прямоугольник со скруглёнными верхними углами.
  return <path d={…} fill="currentColor" className={selected ? s.selected : s.column} />
}
```

Recharts вычисляет `x`, `y`, `width`, `height` и передаёт их вам. Рисуете что угодно.

## Клик по графику

```tsx
<BarChart
  onClick={(state) => {
    const point = data[Number(state.activeTooltipIndex)]   // на каком месяце кликнули
    if (point) onSelect(point.month)                        // → ?month=2026-07 в адресе
  }}
>
```

Месяц хранится в адресе, поэтому вся главная (карточки, «бублик», бюджеты) переключается на
выбранный месяц.

## «Бублик» и список, которые подсвечивают друг друга

[category-breakdown.tsx](../src/widgets/category-breakdown/ui/category-breakdown.tsx) — одно
состояние на двоих:

```tsx
const [hovered, setHovered] = useState<number | null>(null)

<Pie onMouseEnter={(_, i) => setHovered(i)} onMouseLeave={() => setHovered(null)}>
  {slices.map((s, i) => (
    <Cell fill={s.color} opacity={hovered === null || hovered === i ? 1 : 0.35} />
  ))}
</Pie>

{items.map((item, i) => (
  <Link onMouseEnter={() => setHovered(i)} className={hovered === i ? s.hover : ''} …>
))}
```

Навели на сектор → `hovered = 2` → подсветилась третья строка. Навели на строку → то же самое
для сектора. Это обычный React: общее состояние у общего родителя.

## Баланс за год без отдельного запроса

На странице «Счета» график баланса за 12 месяцев, хотя сервер такого не отдаёт. Он отдаёт
текущий баланс и итог каждого месяца (доходы − расходы). Считаем **назад от сегодня**:

```
сейчас на счетах:            317 000
итог октября:                −30 000  →  на конец сентября было 317 000 − (−30 000) = 347 000
итог сентября:               +36 000  →  на конец августа было 347 000 − 36 000 = 311 000
…
```

Код — шесть строк: [balance-history.ts](../src/widgets/accounts-overview/lib/balance-history.ts).

## Попробуйте сами

1. Почему в «Сальдо» графики грузятся лениво (`lazy` в маршрутах)?
2. Как сделать, чтобы на главной был не «бублик», а горизонтальные полосы?

<details>
<summary>Ответы</summary>

1. Recharts — самая тяжёлая зависимость, ~88 КБ gzip. Если открыть сразу страницу импорта,
   этот код не скачивается вовсе.
2. `<BarChart layout="vertical" data={items}>` с `<XAxis type="number" />`,
   `<YAxis type="category" dataKey="name" />` и `<Bar dataKey="amount">` с `<Cell>` для цветов.
</details>
