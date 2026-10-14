/**
 * Мастер импорта выписки: Файл → Колонки → Проверка → Готово.
 *
 * Это КЛИЕНТСКОЕ состояние (черновик, которого ещё нет на сервере) — поэтому
 * createSlice, а не RTK Query. В состоянии храним только исходные данные:
 * таблицу из файла, разметку колонок и правки пользователя. Всё производное
 * (разобранные строки, итоги, что импортировать) — селекторы createSelector:
 * они пересчитываются, только когда поменялись входные данные, и возвращают
 * тот же массив по ссылке — компоненты не перерисовываются зря.
 */
import { type PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit'

import type { BulkResult, ID, TransactionInput } from '@/shared/api'

import { type ImportRow, type Mapping, type Role, buildRows, detectMapping, looksLikeHeader, parseCsv } from '../lib/parse'

export type Step = 'upload' | 'map' | 'review' | 'done'

interface ImportState {
  step: Step
  fileName: string
  table: string[][]
  hasHeader: boolean
  mapping: Mapping
  accountId: ID
  /** Правки пользователя по номеру строки: другая категория, исключить из импорта. */
  overrides: Record<number, { categoryId?: ID; skip?: boolean }>
  result: BulkResult | null
}

const initialState: ImportState = {
  step: 'upload',
  fileName: '',
  table: [],
  hasHeader: true,
  mapping: { date: null, amount: null, description: null },
  accountId: 'card',
  overrides: {},
  result: null,
}

export const importSlice = createSlice({
  name: 'import',
  initialState,
  reducers: {
    fileLoaded: (state, action: PayloadAction<{ fileName: string; text: string }>) => {
      const table = parseCsv(action.payload.text)
      const hasHeader = looksLikeHeader(table[0])
      return { ...initialState, accountId: state.accountId, step: 'map', fileName: action.payload.fileName, table, hasHeader, mapping: detectMapping(table, hasHeader) }
    },
    headerToggled: (state) => {
      state.hasHeader = !state.hasHeader
      state.overrides = {}
    },
    columnAssigned: (state, action: PayloadAction<{ role: Role; index: number | null }>) => {
      const { role, index } = action.payload
      // Одна колонка — одна роль: если колонку уже назначили на другое, снимаем.
      for (const r of Object.keys(state.mapping) as Role[]) if (state.mapping[r] === index) state.mapping[r] = null
      state.mapping[role] = index
      state.overrides = {}
    },
    accountChanged: (state, action: PayloadAction<ID>) => {
      state.accountId = action.payload
    },
    stepChanged: (state, action: PayloadAction<Step>) => {
      state.step = action.payload
    },
    rowCategoryChanged: (state, action: PayloadAction<{ line: number; categoryId: ID }>) => {
      state.overrides[action.payload.line] = { ...state.overrides[action.payload.line], categoryId: action.payload.categoryId }
    },
    rowToggled: (state, action: PayloadAction<number>) => {
      const current = state.overrides[action.payload]
      state.overrides[action.payload] = { ...current, skip: !current?.skip }
    },
    importFinished: (state, action: PayloadAction<BulkResult>) => {
      state.step = 'done'
      state.result = action.payload
    },
    importReset: (state) => ({ ...initialState, accountId: state.accountId }),
  },
  selectors: {
    selectImport: (state) => state,
  },
})

export const { fileLoaded, headerToggled, columnAssigned, accountChanged, stepChanged, rowCategoryChanged, rowToggled, importFinished, importReset } =
  importSlice.actions
export const { selectImport } = importSlice.selectors

export interface ReviewRow extends ImportRow {
  skip: boolean
}

const selectTable = (state: RootState) => state.import.table
const selectMapping = (state: RootState) => state.import.mapping
const selectHasHeader = (state: RootState) => state.import.hasHeader
const selectOverrides = (state: RootState) => state.import.overrides

/** Строки, разобранные по разметке. Пересчёт — только при смене таблицы или разметки. */
export const selectParsedRows = createSelector([selectTable, selectMapping, selectHasHeader], buildRows)

/** Строки с правками пользователя. Строки с ошибкой всегда пропускаются. */
export const selectReviewRows = createSelector([selectParsedRows, selectOverrides], (rows, overrides): ReviewRow[] =>
  rows.map((row) => {
    const o = overrides[row.line]
    return { ...row, categoryId: o?.categoryId ?? row.categoryId, skip: Boolean(row.error || o?.skip || !(o?.categoryId ?? row.categoryId)) }
  }),
)

/** Готовые тела запроса + итоги для кнопки «Импортировать 14 операций». */
export const selectImportPlan = createSelector([selectReviewRows, (state: RootState) => state.import.accountId], (rows, accountId) => {
  const inputs: TransactionInput[] = []
  let income = 0
  let expense = 0
  for (const row of rows) {
    if (row.skip) continue
    const amount = Math.abs(row.amount!)
    const type = row.amount! < 0 ? 'expense' : 'income'
    if (type === 'income') income += amount
    else expense += amount
    inputs.push({ type, amount, date: row.date!, accountId, toAccountId: null, categoryId: row.categoryId, note: row.description.slice(0, 200) })
  }
  return {
    inputs,
    income,
    expense,
    errors: rows.filter((r) => r.error).length,
    uncategorized: rows.filter((r) => !r.error && !r.categoryId).length,
  }
})
