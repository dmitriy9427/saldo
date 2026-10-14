import { type CashflowPoint, type MonthKey, type MonthSummary, baseApi } from '@/shared/api'

/** Отчёты: итоги месяца и денежный поток. Тег Stats — его инвалидируют мутации операций. */
export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMonthSummary: build.query<MonthSummary, MonthKey>({
      query: (month) => `stats/summary?month=${month}`,
      providesTags: ['Stats'],
    }),
    getCashflow: build.query<CashflowPoint[], { months: number; end: MonthKey }>({
      query: ({ months, end }) => `stats/cashflow?months=${months}&end=${end}`,
      providesTags: ['Stats'],
    }),
  }),
})

export const { useGetMonthSummaryQuery, useGetCashflowQuery } = reportApi
