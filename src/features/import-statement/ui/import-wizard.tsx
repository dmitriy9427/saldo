import { CheckCircle2, FileUp, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useGetAccountsQuery } from '@/entities/account'
import { CategoryIcon, useCategoryMap } from '@/entities/category'
import { useImportTransactionsMutation } from '@/entities/transaction'
import { errorMessage } from '@/shared/api'
import { cx, formatDay } from '@/shared/lib'
import { useAppDispatch, useAppSelector } from '@/shared/model'
import { Button, Card, Money, Select } from '@/shared/ui'

import { decode } from '../lib/parse'
import type { Role } from '../lib/parse'
import { makeSampleCsv } from '../lib/sample'
import {
  type Step,
  accountChanged,
  columnAssigned,
  fileLoaded,
  headerToggled,
  importFinished,
  importReset,
  rowCategoryChanged,
  rowToggled,
  selectImport,
  selectImportPlan,
  selectParsedRows,
  selectReviewRows,
  stepChanged,
} from '../model/import-slice'
import s from './import-wizard.module.scss'

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Файл' },
  { id: 'map', label: 'Колонки' },
  { id: 'review', label: 'Проверка' },
  { id: 'done', label: 'Готово' },
]

export function ImportWizard() {
  const { step } = useAppSelector(selectImport)
  const index = STEPS.findIndex((x) => x.id === step)
  return (
    <div className={s.wizard}>
      <ol className={s.steps}>
        {STEPS.map((x, i) => (
          <li key={x.id} className={cx(s.step, i < index && s.passed, i === index && s.current)} aria-current={i === index ? 'step' : undefined}>
            <span className={s.dot}>{i + 1}</span>
            {x.label}
          </li>
        ))}
      </ol>
      {step === 'upload' && <UploadStep />}
      {step === 'map' && <MapStep />}
      {step === 'review' && <ReviewStep />}
      {step === 'done' && <DoneStep />}
    </div>
  )
}

function UploadStep() {
  const dispatch = useAppDispatch()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  async function load(file: File | undefined) {
    if (!file) return
    if (!/\.(csv|txt)$/i.test(file.name)) return setError('Нужен файл .csv — его можно выгрузить в интернет-банке')
    if (file.size > 5_000_000) return setError('Файл больше 5 МБ — выгрузите период поменьше')
    setError('')
    dispatch(fileLoaded({ fileName: file.name, text: decode(await file.arrayBuffer()) }))
  }

  return (
    <Card>
      <label
        className={cx(s.drop, dragging && s.dragging)}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void load(e.dataTransfer.files[0])
        }}
      >
        <FileUp className={s.dropIcon} aria-hidden />
        <span className={s.dropTitle}>Перетащите выписку сюда или выберите файл</span>
        <span className={s.dropText}>CSV из интернет-банка: колонки с датой, суммой и описанием. Кодировка UTF-8 или Windows-1251 — определится сама.</span>
        <input type="file" accept=".csv,.txt,text/csv" className={s.file} onChange={(e) => void load(e.target.files?.[0])} />
      </label>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.sample}>
        <span>Нет выписки под рукой?</span>
        <Button icon={<Sparkles />} onClick={() => dispatch(fileLoaded({ fileName: 'Пример выписки.csv', text: makeSampleCsv() }))}>
          Попробовать на примере
        </Button>
      </div>
    </Card>
  )
}

const ROLE_LABEL: Record<Role, string> = { date: 'Дата', amount: 'Сумма', description: 'Описание' }

function MapStep() {
  const dispatch = useAppDispatch()
  const { table, hasHeader, mapping, fileName, accountId } = useAppSelector(selectImport)
  const rows = useAppSelector(selectParsedRows)
  const { data: accounts = [] } = useGetAccountsQuery()
  const width = Math.max(0, ...table.map((r) => r.length))
  const preview = table.slice(0, 6)
  const ok = rows.filter((r) => !r.error).length
  const complete = mapping.date !== null && mapping.amount !== null

  return (
    <Card title={`Колонки — ${fileName}`}>
      <p className={s.lead}>Проверьте, какая колонка за что отвечает. Мы угадали по заголовкам и содержимому.</p>
      <div className={s.options}>
        <label className={s.check}>
          <input type="checkbox" checked={hasHeader} onChange={() => dispatch(headerToggled())} />
          Первая строка — заголовки
        </label>
        <label className={s.inline}>
          На счёт
          <Select value={accountId} onChange={(e) => dispatch(accountChanged(e.target.value))} className={s.compact}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </label>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              {Array.from({ length: width }, (_, i) => {
                const role = (Object.keys(mapping) as Role[]).find((r) => mapping[r] === i) ?? ''
                return (
                  <th key={i}>
                    <Select
                      value={role}
                      onChange={(e) => {
                        const next = e.target.value as Role | ''
                        if (next) dispatch(columnAssigned({ role: next, index: i }))
                        else if (role) dispatch(columnAssigned({ role, index: null }))
                      }}
                      aria-label={`Колонка ${i + 1}`}
                      className={cx(s.compact, role && s.assigned)}
                    >
                      <option value="">Не нужна</option>
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </Select>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, r) => (
              <tr key={r} className={cx(hasHeader && r === 0 && s.headerRow)}>
                {Array.from({ length: width }, (_, i) => (
                  <td key={i}>{row[i]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.actions}>
        <span className={s.muted}>
          {complete ? `Распознано строк: ${ok} из ${rows.length}` : 'Укажите хотя бы дату и сумму'}
        </span>
        <Button onClick={() => dispatch(importReset())}>Другой файл</Button>
        <Button variant="primary" disabled={!complete || ok === 0} onClick={() => dispatch(stepChanged('review'))}>
          Дальше
        </Button>
      </div>
    </Card>
  )
}

function ReviewStep() {
  const dispatch = useAppDispatch()
  const rows = useAppSelector(selectReviewRows)
  const plan = useAppSelector(selectImportPlan)
  const { categories } = useCategoryMap()
  const [importRows, { isLoading, error }] = useImportTransactionsMutation()

  return (
    <Card title="Проверка">
      <p className={s.lead}>
        Категории подобраны по описанию. Поправьте, где нужно, и снимите галочку со строк, которые не нужны. Повторный импорт той же выписки не задвоит операции.
      </p>
      <div className={s.summary}>
        <span>
          Расходы <Money value={-plan.expense} trim />
        </span>
        <span>
          Доходы <Money value={plan.income} sign trim tone="income" />
        </span>
        {plan.errors > 0 && <span className={s.bad}>С ошибкой: {plan.errors}</span>}
        {plan.uncategorized > 0 && <span className={s.warn}>Без категории: {plan.uncategorized}</span>}
      </div>
      <ul className={s.review}>
        {rows.map((row) => {
          const kind = (row.amount ?? 0) < 0 ? 'expense' : 'income'
          return (
            <li key={row.line} className={cx(s.reviewRow, row.skip && s.skipped)}>
              <input
                type="checkbox"
                checked={!row.skip}
                disabled={Boolean(row.error) || !row.categoryId}
                onChange={() => dispatch(rowToggled(row.line))}
                aria-label={`Импортировать строку ${row.line}`}
              />
              <CategoryIcon category={categories.find((c) => c.id === row.categoryId)} size="sm" />
              <div className={s.reviewMain}>
                <span className={s.reviewTitle}>{row.description || 'Без описания'}</span>
                <span className={cx(s.reviewMeta, row.error && s.bad)}>{row.error ?? (row.date && formatDay(row.date))}</span>
              </div>
              {!row.error && (
                <Select
                  value={row.categoryId ?? ''}
                  onChange={(e) => dispatch(rowCategoryChanged({ line: row.line, categoryId: e.target.value }))}
                  aria-label={`Категория для «${row.description}»`}
                  className={cx(s.compact, s.category, !row.categoryId && s.missing)}
                >
                  <option value="">Выберите категорию</option>
                  {categories.filter((c) => c.kind === kind).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
              {row.amount !== null && <Money value={row.amount} sign trim tone={row.amount > 0 ? 'income' : undefined} className={s.reviewAmount} />}
            </li>
          )
        })}
      </ul>
      {error && <p className={s.error} role="alert">{errorMessage(error)}</p>}
      <div className={s.actions}>
        <Button onClick={() => dispatch(stepChanged('map'))}>Назад</Button>
        <Button
          variant="primary"
          loading={isLoading}
          disabled={!plan.inputs.length}
          onClick={async () => {
            const result = await importRows(plan.inputs).unwrap().catch(() => null)
            if (result) dispatch(importFinished(result))
          }}
        >
          Импортировать {plan.inputs.length} {plural(plan.inputs.length)}
        </Button>
      </div>
    </Card>
  )
}

function DoneStep() {
  const dispatch = useAppDispatch()
  const { result } = useAppSelector(selectImport)
  if (!result) return null
  return (
    <Card>
      <div className={s.done}>
        <CheckCircle2 className={s.doneIcon} aria-hidden />
        <p className={s.doneTitle}>
          Добавлено операций: {result.created}
        </p>
        {result.skipped > 0 && <p className={s.muted}>Пропущено как дубликаты: {result.skipped} — такие операции уже были.</p>}
        <div className={s.actions}>
          <Button onClick={() => dispatch(importReset())}>Импортировать ещё</Button>
          <Link to="/transactions" className={s.link}>
            К операциям →
          </Link>
        </div>
      </div>
    </Card>
  )
}

/** «Импортировать 1 операцию / 2 операции / 5 операций». */
function plural(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'операцию'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'операции'
  return 'операций'
}

