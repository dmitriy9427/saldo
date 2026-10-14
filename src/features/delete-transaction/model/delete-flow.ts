/**
 * Удаление с отменой («Удалено · Отменить», как в Gmail).
 *
 * Сценарий целиком — реакция listener middleware на deleteRequested:
 *   1. сразу убрать строку из всех закешированных списков (оптимистично);
 *   2. показать тост с кнопкой «Отменить» — она диспатчит deleteUndone(id);
 *   3. ждать deleteUndone с этим id не дольше UNDO_MS (listenerApi.take);
 *   4. отменили — вернуть строки (patch.undo()); нет — отправить DELETE;
 *   5. сервер ответил ошибкой — вернуть строки и сказать об этом.
 *
 * Почему не setTimeout в компоненте: строка исчезла — компонент размонтирован,
 * его таймер и обработчики уже не выполнятся (или выполнятся «в пустоту»).
 * Listener живёт в store и не зависит от того, что сейчас на экране.
 */
import { createAction } from '@reduxjs/toolkit'

import { transactionApi } from '@/entities/transaction'
import type { Transaction, TransactionQuery } from '@/shared/api'
import { errorMessage } from '@/shared/api'
import { startAppListening, toastShown } from '@/shared/model'

export const UNDO_MS = 5000

export const deleteRequested = createAction<Transaction>('deleteTransaction/requested')
export const deleteUndone = createAction<string>('deleteTransaction/undone')

startAppListening({
  actionCreator: deleteRequested,
  effect: async ({ payload: transaction }, api) => {
    const { id } = transaction

    // 1. Все страницы списка, где есть эта операция, — по тегу { Transaction, id }.
    const patches = transactionApi.util
      .selectInvalidatedBy(api.getState(), [{ type: 'Transaction', id }])
      .filter((entry) => entry.endpointName === 'getTransactions')
      .map(({ originalArgs }) =>
        api.dispatch(
          transactionApi.util.updateQueryData('getTransactions', originalArgs as TransactionQuery, (draft) => {
            const before = draft.items.length
            draft.items = draft.items.filter((t) => t.id !== id)
            if (draft.items.length !== before) {
              draft.total -= 1
              if (transaction.type === 'income') draft.totals.income -= transaction.amount
              if (transaction.type === 'expense') draft.totals.expense -= transaction.amount
            }
          }),
        ),
      )

    // 2. Тост с кнопкой — экшеном, который придёт к нам же (шаг 3).
    api.dispatch(
      toastShown({
        message: 'Операция удалена',
        tone: 'info',
        duration: UNDO_MS,
        action: { label: 'Отменить', action: deleteUndone(id) },
      }),
    )

    // 3. take — «дождаться экшена»: вернёт его или null по таймауту.
    const undone = await api.take((action) => deleteUndone.match(action) && action.payload === id, UNDO_MS)

    if (undone) {
      patches.forEach((p) => p.undo())
      return
    }

    // 4. Время вышло — удаляем по-настоящему. Мутация инвалидирует теги:
    // списки, остатки, графики и бюджеты перезапросятся.
    try {
      await api.dispatch(transactionApi.endpoints.deleteTransaction.initiate(id)).unwrap()
    } catch (error) {
      patches.forEach((p) => p.undo())
      api.dispatch(toastShown({ message: `Не удалось удалить: ${errorMessage(error)}`, tone: 'error' }))
    }
  },
})
