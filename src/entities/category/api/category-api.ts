import { type Category, type ID, baseApi } from '@/shared/api'

/**
 * Категории меняются редко — держим в кеше всю сессию (keepUnusedDataFor:
 * Infinity) и не перезапрашиваем при фокусе окна.
 */
export const categoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Category[], void>({
      query: () => 'categories',
      providesTags: ['Category'],
      keepUnusedDataFor: Infinity,
    }),
  }),
})

export const { useGetCategoriesQuery } = categoryApi

const EMPTY: Category[] = []

/**
 * Категории словарём { id → категория } для быстрого поиска в строках списка.
 *
 * selectFromResult — компонент подписывается не на весь ответ запроса, а на
 * то, что вернули отсюда. Плюс useMemo внутри селектора не нужен: RTK Query
 * сравнивает результат по ссылкам и не перерисовывает, если данные те же.
 */
export function useCategoryMap() {
  return useGetCategoriesQuery(undefined, {
    selectFromResult: ({ data = EMPTY }) => ({ categories: data, byId: indexById(data) }),
  })
}

// Кеш словаря по ссылке на массив: тот же массив — тот же словарь (иначе
// selectFromResult каждый раз возвращал бы новый объект и вызывал ререндер).
const cache = new WeakMap<Category[], Map<ID, Category>>()
function indexById(list: Category[]) {
  let map = cache.get(list)
  if (!map) {
    map = new Map(list.map((c) => [c.id, c]))
    cache.set(list, map)
  }
  return map
}
