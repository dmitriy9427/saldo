/**
 * Глобальные типы RootState и AppDispatch — чтобы нижние слои (shared, features)
 * знали форму состояния, не импортируя app (запрещено правилами FSD).
 * См. shared/model/hooks.ts.
 */
import type { AppStore, RootStateType } from './store'

declare global {
  type RootState = RootStateType
  type AppDispatch = AppStore['dispatch']
}
