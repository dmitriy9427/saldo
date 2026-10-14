import { useState } from 'react'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router/dom'

import { makeStore } from '../model'
import { router } from '../routes'

export function App() {
  // Store создаётся один раз на жизнь приложения (в тестах — свой на каждый тест).
  const [store] = useState(makeStore)
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}
