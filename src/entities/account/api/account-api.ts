import { type Account, baseApi } from '@/shared/api'

/** Счета с остатками. Остатки считает сервер; любые операции помечают тег Account устаревшим. */
export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccounts: build.query<Account[], void>({
      query: () => 'accounts',
      providesTags: ['Account'],
    }),
  }),
})

export const { useGetAccountsQuery } = accountApi
