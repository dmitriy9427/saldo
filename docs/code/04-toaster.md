# 4. Уведомления (тосты)

Три файла работают вместе:

| Файл | Роль |
| --- | --- |
| [shared/model/toast.ts](../../src/shared/model/toast.ts) | слайс Redux: список тостов, экшены «показать» и «убрать» |
| [shared/ui/toaster.tsx](../../src/shared/ui/toaster.tsx) | компонент: рисует список внизу экрана |
| `app-shell.tsx` | монтирует `<Toaster />` один раз на всё приложение |

## Где на экране

Тёмная плашка внизу по центру: «Добавлено: 1 250,50 ₽», «Операция удалена · Отменить». Внизу
плашки тонкая полоска показывает, сколько осталось до исчезновения.

## Что делает

- Показать тост можно **из любого места**, даже не из компонента: `dispatch(toastShown({ message }))`.
- Тост исчезает сам через 4 секунды (или через заданное время).
- Навели мышь или перешли с клавиатуры — время **останавливается**. Успеете нажать «Отменить».
- Одновременно на экране не больше трёх тостов, старые уходят.
- Скринридер зачитывает новый тост сам.

## Как пользоваться

```tsx
const dispatch = useAppDispatch()

dispatch(toastShown({ message: 'Изменения сохранены' }))                     // зелёный, 4 с
dispatch(toastShown({ message: 'Не удалось удалить', tone: 'error' }))       // красный
dispatch(toastShown({
  message: 'Операция удалена',
  tone: 'info',
  duration: 5000,
  action: { label: 'Отменить', action: deleteUndone(id) },                   // кнопка
}))
```

## Почему в Redux, а не в `useState`

Тост показывают из формы, из listener'а удаления, из кнопки сброса. Если бы список тостов
жил в `useState` компонента `Toaster`, каждому нужно было бы как-то до него дотянуться:
пробрасывать функцию через пропсы или контекст. А listener вообще не компонент, у него нет
доступа к контексту React. Через Redux достаточно `dispatch` — он есть везде.

## Слайс — разбор по частям

Подробно о `createEntityAdapter` и `prepare` — в [главе 02](../02-redux-toolkit.md#слайс-тостов--sharedmodeltoastts).
Здесь коротко, что происходит при вызове:

```
dispatch(toastShown({ message: 'Готово' }))
   ↓ prepare: добавить id, tone='success', duration=4000
{ type: 'toasts/toastShown', payload: { id: 'V1St', message: 'Готово', tone: 'success', duration: 4000 } }
   ↓ reducer: adapter.addOne, лишние (больше трёх) — removeOne
state.toasts = { ids: ['V1St'], entities: { V1St: {…} } }
   ↓ useAppSelector(selectToasts) в Toaster заметил изменение
на экране появился тост
```

## Компонент Toaster

```tsx
export function Toaster() {
  const toasts = useAppSelector(selectToasts)
  return (
    <ol className={s.toaster} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  )
}
```

- `useAppSelector(selectToasts)` — массив тостов из стора. Изменился — перерисовка.
- `role="status" aria-live="polite"` — «живая область»: всё, что в ней появляется, скринридер
  зачитывает, когда закончит текущую фразу (`polite` — вежливо, не перебивая).
- `key={toast.id}` — React по ключу понимает, какой тост новый, а какой ушёл. С ключом по
  индексу (`key={i}`) при уходе первого тоста таймеры остальных перепутались бы.

## ToastItem — таймер с паузой

Самое интересное место. Задача: тост висит 4 секунды, но если навести мышь, время
останавливается, а после ухода мыши — идёт дальше **с того же места**, а не заново.

```tsx
function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const [paused, setPaused] = useState(false)
  const left = useRef(toast.duration)
```

- `paused` — на паузе ли сейчас. Это `useState`: от него зависит, что нарисовано (полоска
  останавливается), поэтому изменение должно вызывать перерисовку.
- `left` — сколько миллисекунд осталось. Это `useRef`, а не `useState`: значение нужно
  **помнить** между перерисовками, но **рисовать** его не нужно. Изменение `ref` не вызывает
  перерисовку.

```tsx
  useEffect(() => {
    if (paused) return                                  // ① на паузе — таймер не ставим
    const started = Date.now()                          // ② когда запустили
    const id = setTimeout(() => dispatch(toastDismissed(toast.id)), left.current)  // ③
    return () => {                                      // ④ очистка
      clearTimeout(id)
      left.current -= Date.now() - started
    }
  }, [paused, dispatch, toast.id])
```

Проследим по времени:

```
0 мс      появился тост, paused=false, left=4000
          ② started=0, ③ таймер на 4000 мс
1500 мс   навели мышь → paused=true → React перед новым запуском эффекта вызывает очистку ④:
          таймер отменён, left = 4000 − (1500 − 0) = 2500
          эффект запустился снова, но ① paused — выходим, таймера нет
9000 мс   убрали мышь → paused=false → эффект: started=9000, таймер на left=2500
11500 мс  таймер сработал → toastDismissed → тост исчез
```

Главный трюк — **функция очистки** ④. React вызывает её перед каждым повторным запуском
эффекта и при исчезновении компонента. В ней мы и отменяем таймер, и «откладываем в
копилку», сколько времени успело пройти.

```tsx
  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
```

Пауза и от мыши, и от клавиатуры: человек с клавиатурой тоже должен успеть нажать «Отменить».

```tsx
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            dispatch(toast.action!.action)               // отправить записку из тоста (например, deleteUndone)
            dispatch(toastDismissed(toast.id))           // и убрать тост
          }}
        >
          {toast.action.label}
        </button>
      )}
      <span
        className={s.timer}
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      />
```

Полоска внизу — CSS-анимация `scaleX(1 → 0)` длиной в `duration`. На паузе
`animation-play-state: paused` её останавливает, и она стоит синхронно с таймером. Считать
ширину в JavaScript не нужно.

## Что будет, если…

- **`left` сделать через `useState`** — каждое изменение вызывало бы лишнюю перерисовку, а
  внутри очистки значение было бы «старым» (замыкание): пауза сбрасывала бы время на 4 секунды;
- **убрать функцию очистки** — навели мышь, а тост всё равно исчезнет вовремя: таймер никто не отменил;
- **`key={index}`** — уйдёт первый тост, и у второго внезапно окажется таймер первого.

## Проверьте себя

1. Почему кнопка в тосте — Redux-экшен, а не функция `onClick`, переданная в `toastShown`?
2. В какой момент React вызывает функцию, которую вернул `useEffect`?

<details>
<summary>Ответы</summary>

1. В стор кладут только сериализуемые данные: функцию не сохранить, не показать в DevTools и
   не «перемотать». Записку-экшен можно сохранить и отправить позже.
2. Перед каждым повторным запуском эффекта (изменилась зависимость) и при исчезновении
   компонента со страницы.
</details>
