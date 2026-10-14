/**
 * Типизированные хуки Redux.
 *
 * Проблема FSD: тип RootState собирается в app (там store), а хуки нужны в
 * features и widgets — ниже app. Импортировать из app вниз нельзя. Решение из
 * документации FSD: app объявляет RootState и AppDispatch ГЛОБАЛЬНЫМИ типами
 * (app/model/global.d.ts), а shared пользуется ими, ничего не импортируя.
 * Типы стираются при сборке — зависимости в коде нет.
 */
import { useDispatch, useSelector } from 'react-redux'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
