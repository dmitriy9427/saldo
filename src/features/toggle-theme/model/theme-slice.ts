/**
 * Тема: системная / светлая / тёмная. Выбор сохраняется в localStorage.
 *
 * Сохранение — не в редьюсере (он должен быть чистым: без записи на диск),
 * а реакцией listener middleware на экшен themeChanged.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'

import { startAppListening } from '@/shared/model'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'saldo:theme'

function readSaved(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

export const themeSlice = createSlice({
  name: 'theme',
  // Функция, а не объект: localStorage читается при создании store, а не при импорте модуля.
  initialState: () => ({ mode: readSaved() }),
  reducers: {
    themeChanged: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload
    },
  },
  selectors: {
    selectThemeMode: (state) => state.mode,
  },
})

export const { themeChanged } = themeSlice.actions
export const { selectThemeMode } = themeSlice.selectors

startAppListening({
  actionCreator: themeChanged,
  effect: (action) => {
    try {
      if (action.payload === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, action.payload)
    } catch {
      // Нет доступа к хранилищу — тема просто не запомнится.
    }
  },
})
