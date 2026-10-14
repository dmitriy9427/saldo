import { type BudgetStatus, type ID, type MonthKey, baseApi } from '@/shared/api'

export const budgetApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBudgets: build.query<BudgetStatus[], MonthKey>({
      query: (month) => `budgets?month=${month}`,
      providesTags: ['Budget'],
    }),
    setBudget: build.mutation<BudgetStatus, { categoryId: ID; limit: number }>({
      query: ({ categoryId, limit }) => ({ url: `budgets/${categoryId}`, method: 'PUT', body: { limit } }),
      invalidatesTags: (_r, error) => (error ? [] : ['Budget']),
    }),
    deleteBudget: build.mutation<void, ID>({
      query: (categoryId) => ({ url: `budgets/${categoryId}`, method: 'DELETE' }),
      invalidatesTags: ['Budget'],
      // Удаление — сразу убираем карточку из всех закешированных месяцев (оптимистично).
      async onQueryStarted(categoryId, { dispatch, getState, queryFulfilled }) {
        const patches = budgetApi.util.selectCachedArgsForQuery(getState(), 'getBudgets').map((month) =>
          dispatch(
            budgetApi.util.updateQueryData('getBudgets', month, (draft) => draft.filter((b) => b.categoryId !== categoryId)),
          ),
        )
        queryFulfilled.catch(() => patches.forEach((p) => p.undo()))
      },
    }),
  }),
})

export const { useGetBudgetsQuery, useSetBudgetMutation, useDeleteBudgetMutation } = budgetApi
