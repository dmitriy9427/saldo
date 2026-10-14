import { baseApi } from '@/shared/api'

/**
 * Сброс демо-данных. Эндпоинт объявлен в самой фиче: он нужен только ей,
 * сущностям о нём знать незачем. После ответа сервера — resetApiState:
 * весь кеш RTK Query выбрасывается, активные запросы грузятся заново.
 */
export const resetApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    resetDemo: build.mutation<void, void>({
      query: () => ({ url: 'demo/reset', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(baseApi.util.resetApiState())
        } catch {
          // Ошибку покажет кнопка (unwrap в компоненте).
        }
      },
    }),
  }),
})

export const { useResetDemoMutation } = resetApi
