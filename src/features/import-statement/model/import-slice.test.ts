import { describe, expect, it } from 'vitest'

import { makeStore } from '@/app/model'

import { makeSampleCsv } from '../lib/sample'
import { columnAssigned, fileLoaded, rowCategoryChanged, rowToggled, selectImportPlan, selectReviewRows } from './import-slice'

describe('мастер импорта (slice + селекторы)', () => {
  it('файл → разметка угадана → план импорта без ошибочных и некатегоризованных строк', () => {
    const store = makeStore()
    store.dispatch(fileLoaded({ fileName: 'x.csv', text: makeSampleCsv(new Date(2026, 9, 14)) }))
    const state = store.getState()
    expect(state.import.step).toBe('map')
    const plan = selectImportPlan(state)
    expect(plan.errors).toBe(1)
    expect(plan.uncategorized).toBe(2)
    expect(plan.inputs).toHaveLength(14)
    expect(plan.inputs.every((i) => i.amount > 0 && i.categoryId)).toBe(true)
  })

  it('правка категории включает строку; снятая галочка исключает', () => {
    const store = makeStore()
    store.dispatch(fileLoaded({ fileName: 'x.csv', text: makeSampleCsv(new Date(2026, 9, 14)) }))
    const uncategorized = selectReviewRows(store.getState()).find((r) => !r.error && !r.categoryId)!
    store.dispatch(rowCategoryChanged({ line: uncategorized.line, categoryId: 'transport' }))
    expect(selectImportPlan(store.getState()).inputs).toHaveLength(15)
    store.dispatch(rowToggled(uncategorized.line))
    expect(selectImportPlan(store.getState()).inputs).toHaveLength(14)
  })

  it('селекторы мемоизированы: без изменений — тот же массив по ссылке', () => {
    const store = makeStore()
    store.dispatch(fileLoaded({ fileName: 'x.csv', text: makeSampleCsv() }))
    const a = selectReviewRows(store.getState())
    store.dispatch({ type: 'unrelated' })
    expect(selectReviewRows(store.getState())).toBe(a)
    store.dispatch(columnAssigned({ role: 'description', index: 1 }))
    expect(selectReviewRows(store.getState())).not.toBe(a)
  })
})
