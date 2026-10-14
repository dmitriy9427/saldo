import { isRouteErrorResponse, useRouteError } from 'react-router'

import { Button, ErrorState } from '@/shared/ui'

import s from './route-error.module.scss'

/** Ошибка при отрисовке страницы — вместо белого экрана. */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Неизвестная ошибка'
  // Новая версия сайта выложена, а старая вкладка просит удалённый файл страницы.
  const stale = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)
  return (
    <div className={s.root}>
      <ErrorState message={stale ? 'Вышла новая версия — обновите страницу' : message} />
      <Button variant="primary" onClick={() => location.reload()}>
        Обновить страницу
      </Button>
    </div>
  )
}

/** Пока грузится код первой страницы — та же заставка, что в index.html. */
export function RouteFallback() {
  return <div className="boot" role="status" aria-label="Загрузка" />
}
