import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithStore, setupApi } from 'test-utils'

import { API_URL } from '@/shared/config'

import { formOpened } from '../model/form-slice'
import { TransactionFormModal } from './transaction-form'

const ctx = setupApi()

function open() {
  const utils = renderWithStore(<TransactionFormModal />)
  utils.store.dispatch(formOpened({ preset: { date: '2026-10-14' } }))
  return utils
}

describe('форма операции', () => {
  it('ошибки своей проверки — под полями, с aria-invalid', async () => {
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Введите сумму')).toBeInTheDocument()
    expect(screen.getByLabelText('Сумма')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Выберите категорию')).toBeInTheDocument()
  })

  it('сохраняет операцию: копейки на сервере, тост, окно закрыто', async () => {
    const { store } = open()
    await userEvent.type(await screen.findByLabelText('Сумма'), '1 250,5')
    await userEvent.click(await screen.findByRole('radio', { name: 'Кафе и рестораны' }))
    await userEvent.type(screen.getByLabelText('Заметка'), 'Ужин')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() => expect(store.getState().transactionForm.open).toBe(false))
    const saved = ctx.db.transactions({ q: 'Ужин' }).items[0]
    expect(saved).toMatchObject({ amount: 125050, categoryId: 'cafe', type: 'expense' })
    expect(Object.values(store.getState().toasts.entities)[0]?.message).toMatch(/Добавлено/)
  })

  it('ошибка сервера по полю (422) — показывается под этим полем', async () => {
    ctx.server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json({ message: 'Проверьте поля', fields: { note: 'Сервер против этой заметки' } }, { status: 422 }),
      ),
    )
    open()
    await userEvent.type(await screen.findByLabelText('Сумма'), '100')
    await userEvent.click(await screen.findByRole('radio', { name: 'Продукты' }))
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Сервер против этой заметки')).toBeInTheDocument()
  })

  it('перевод: вместо категорий — «Откуда» и «Куда»', async () => {
    open()
    await userEvent.click(await screen.findByRole('radio', { name: 'Перевод' }))
    expect(screen.queryByRole('radiogroup', { name: 'Категория' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Куда')).toBeInTheDocument()
  })
})
