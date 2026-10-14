/**
 * Сервер внутри браузера (Mock Service Worker).
 *
 * На GitHub Pages нет бэкенда. MSW регистрирует Service Worker, который
 * перехватывает fetch приложения и отвечает из handlers.ts. Запросы видны в
 * DevTools → Network как настоящие — RTK Query не знает, что сервера нет.
 * Чтобы подключить настоящий бэкенд, достаточно не вызывать startMockServer().
 *
 * Данные сохраняются в localStorage: это личные финансы — добавленная
 * операция не должна пропасть после перезагрузки или закрытия вкладки.
 */
import { setupWorker } from 'msw/browser'

import { API_URL } from '../config'
import { createDb } from './db'
import { type MockControls, createHandlers } from './handlers'
import type { Dataset } from './seed'

/** Версия в ключе: поменялся формат данных — старые сохранения не ломают приложение. */
const STORAGE_KEY = 'saldo:db:v1'

function load(): Dataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Dataset) : null
  } catch {
    return null
  }
}

export const db = createDb(load())
export const controls: MockControls = { fail: false, latency: null }

let timer: ReturnType<typeof setTimeout> | null = null
function save() {
  timer = null
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db.snapshot()))
  } catch {
    // Хранилище недоступно (приватный режим) — демо работает и без сохранения.
  }
}
db.onChange = () => {
  // Импорт выписки — сотни изменений подряд; пишем один раз в конце.
  timer ??= setTimeout(save, 200)
}
// Закрыли вкладку раньше, чем сработал таймер, — сохраняем сразу.
addEventListener('pagehide', () => timer && save())

export async function startMockServer() {
  const worker = setupWorker(...createHandlers(db, API_URL, controls))
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
  // Пульт для экспериментов из консоли: __saldo.controls.fail = true.
  Object.assign(window, { __saldo: { db, controls } })
}
