/**
 * Уведомления («тосты»): «Операция добавлена», «Удалено · Отменить».
 *
 * createEntityAdapter — готовые редьюсеры и селекторы для коллекции с id:
 * хранит { ids: [...], entities: { [id]: toast } } — поиск по id за O(1),
 * порядок — в ids. addOne/removeOne/selectAll писать не нужно.
 *
 * Кнопка в тосте — не функция, а Redux-экшен (`action`): в состоянии храним
 * только сериализуемые данные (функцию не сохранишь и не покажешь в DevTools).
 * Нажали «Отменить» — Toaster диспатчит этот экшен.
 */
import { type PayloadAction, type UnknownAction, createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
  action?: { label: string; action: UnknownAction }
  /** Сколько показывать, мс. */
  duration: number
}

const adapter = createEntityAdapter<Toast>()

export const toastSlice = createSlice({
  name: 'toasts',
  initialState: adapter.getInitialState(),
  reducers: {
    toastShown: {
      reducer: (state, action: PayloadAction<Toast>) => {
        adapter.addOne(state, action.payload)
        // Не больше трёх на экране: старые уходят.
        if (state.ids.length > 3) adapter.removeOne(state, state.ids[0]!)
      },
      // prepare — подготовить payload: id генерируется здесь, а не в редьюсере
      // (редьюсер должен быть чистой функцией — без случайности).
      prepare: (toast: Omit<Toast, 'id' | 'duration' | 'tone'> & Partial<Pick<Toast, 'id' | 'duration' | 'tone'>>) => ({
        payload: { id: nanoid(), tone: 'success' as const, duration: 4000, ...toast },
      }),
    },
    toastDismissed: (state, action: PayloadAction<string>) => {
      adapter.removeOne(state, action.payload)
    },
  },
  selectors: {
    selectToasts: adapter.getSelectors().selectAll,
  },
})

export const { toastShown, toastDismissed } = toastSlice.actions
export const { selectToasts } = toastSlice.selectors
