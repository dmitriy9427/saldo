import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useGetAccountsQuery } from '@/entities/account'
import { useCategoryMap } from '@/entities/category'
import type { TransactionType } from '@/shared/api'
import { Button, Input, MonthSwitcher, Segmented, Select } from '@/shared/ui'

import { type Period, useTransactionFilters } from '../model/use-filters'
import s from './transaction-filters.module.scss'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
  { value: 'transfer', label: 'Переводы' },
]

const PERIOD_LABEL: Record<Period, string> = {
  month: 'Месяц',
  '3m': '3 месяца',
  year: 'Год',
  all: 'Всё время',
}

export function TransactionFilters() {
  const { filters, set, reset, active } = useTransactionFilters()
  const { data: accounts = [] } = useGetAccountsQuery()
  const { categories } = useCategoryMap()

  // Поиск: поле обновляется сразу, а адрес (и запрос к серверу) — через 300 мс
  // после последней буквы. Иначе каждая буква — запрос.
  const [search, setSearch] = useState(filters.q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** Что мы сами последним записали в адрес — чтобы отличить своё изменение от чужого. */
  const written = useRef(filters.q)
  function onSearch(value: string) {
    setSearch(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      written.current = value
      set({ q: value }, { replace: true })
    }, 300)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // Адрес поменялся НЕ из поля (кнопка «Сбросить», «Назад») — поле следует за адресом.
  useEffect(() => {
    if (filters.q === written.current) return
    written.current = filters.q
    clearTimeout(timer.current)
    setSearch(filters.q)
  }, [filters.q])

  return (
    <div className={s.root}>
      <div className={s.top}>
        <label className={s.search}>
          <Search aria-hidden />
          <Input type="search" placeholder="Поиск по заметке или категории" value={search} onChange={(e) => onSearch(e.target.value)} aria-label="Поиск" />
        </label>
        <Segmented
          label="Тип операций"
          value={filters.type ?? 'all'}
          onChange={(value) => set({ type: value === 'all' ? undefined : (value as TransactionType) })}
          options={TYPE_OPTIONS}
        />
      </div>
      <div className={s.bottom}>
        <Select value={filters.period} onChange={(e) => set({ period: e.target.value as Period })} aria-label="Период" className={s.select}>
          {Object.entries(PERIOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        {filters.period === 'month' && <MonthSwitcher value={filters.month} onChange={(month) => set({ month })} />}
        <Select value={filters.accountId ?? ''} onChange={(e) => set({ accountId: e.target.value || undefined })} aria-label="Счёт" className={s.select}>
          <option value="">Все счета</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Select value={filters.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || undefined })} aria-label="Категория" className={s.select}>
          <option value="">Все категории</option>
          <optgroup label="Расходы">
            {categories.filter((c) => c.kind === 'expense').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="Доходы">
            {categories.filter((c) => c.kind === 'income').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        </Select>
        <Select
          value={`${filters.sort}:${filters.dir}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(':') as ['date' | 'amount', 'asc' | 'desc']
            set({ sort, dir })
          }}
          aria-label="Сортировка"
          className={s.select}
        >
          <option value="date:desc">Сначала новые</option>
          <option value="date:asc">Сначала старые</option>
          <option value="amount:desc">Сначала крупные</option>
          <option value="amount:asc">Сначала мелкие</option>
        </Select>
        {active && (
          <Button variant="ghost" icon={<X />} onClick={reset}>
            Сбросить
          </Button>
        )}
      </div>
    </div>
  )
}
