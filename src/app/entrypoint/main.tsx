import '@fontsource-variable/onest'
import '@fontsource-variable/jetbrains-mono'
import '../styles/index.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

// Сначала поднимаем демо-сервер (MSW), потом приложение: иначе первые запросы
// RTK Query ушли бы «в никуда» до регистрации Service Worker.
// Динамический import — MSW с зависимостями (~150 КБ gzip) лежит в отдельном
// файле: это код только для демо, с настоящим бэкендом его просто не грузят.
const { startMockServer } = await import('@/shared/mock')
await startMockServer()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
