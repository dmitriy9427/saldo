import { Link } from 'react-router'

import { EmptyState, PageHeader } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Страница не найдена" />
      <EmptyState title="Такой страницы нет" text="Возможно, ссылка устарела." action={<Link to="/">На главную</Link>} />
    </>
  )
}
