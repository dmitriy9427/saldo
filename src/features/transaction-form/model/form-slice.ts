/**
 * Открыта ли форма операции и что в ней. Одна модалка на всё приложение
 * (смонтирована в app), открыть её можно откуда угодно: кнопка «+» в меню,
 * клавиша N, клик по строке списка (правка).
 *
 * В payload — сама операция (простой объект), а не только id: форма
 * заполняется мгновенно, без запроса за операцией.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'

import type { Transaction } from '@/shared/api'

import type { TransactionFormValues } from './schema'

interface FormState {
  open: boolean
  /** Правим эту операцию; null — новая. */
  editing: Transaction | null
  /** Предзаполнение новой: тип, категория (из бюджета), счёт. */
  preset: Partial<TransactionFormValues>
}

const initialState: FormState = { open: false, editing: null, preset: {} }

export const transactionFormSlice = createSlice({
  name: 'transactionForm',
  initialState,
  reducers: {
    formOpened: (state, action: PayloadAction<{ editing?: Transaction; preset?: Partial<TransactionFormValues> } | undefined>) => {
      state.open = true
      state.editing = action.payload?.editing ?? null
      state.preset = action.payload?.preset ?? {}
    },
    formClosed: (state) => {
      state.open = false
    },
  },
  selectors: {
    selectForm: (state) => state,
  },
})

export const { formOpened, formClosed } = transactionFormSlice.actions
export const { selectForm } = transactionFormSlice.selectors
