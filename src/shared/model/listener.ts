/**
 * Listener middleware — «реакции» на экшены: побочные эффекты вне компонентов.
 *
 * Пример из приложения (features/delete-transaction): «удалить» → скрыть строку,
 * показать тост «Отменить» и ЖДАТЬ 5 секунд: если пришёл экшен «отменить» —
 * вернуть строку, если нет — отправить DELETE на сервер. Такую цепочку с
 * ожиданием в редьюсере не напишешь (он синхронный и чистый), а в компоненте
 * она оборвётся, если пользователь уйдёт со страницы.
 *
 * Экземпляр живёт в shared: app подключает его middleware к store, а фичи
 * добавляют свои реакции через startAppListening — app не нужно знать о них.
 */
import { addListener, createListenerMiddleware } from '@reduxjs/toolkit'

export const listenerMiddleware = createListenerMiddleware()

export const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>()
export const addAppListener = addListener.withTypes<RootState, AppDispatch>()
