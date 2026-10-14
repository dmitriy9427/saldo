/**
 * Тот же демо-сервер для тестов (Vitest, Node): MSW перехватывает fetch без
 * Service Worker. Каждый тест получает свежую базу — createTestServer().
 */
import { setupServer } from 'msw/node'

import { API_URL } from '../config'
import { createDb } from './db'
import { type MockControls, createHandlers } from './handlers'

/** «Сегодня» в тестах — фиксированный день: даты в проверках не зависят от календаря. */
export const TEST_NOW = new Date(2026, 9, 14, 12, 0)

export function createTestServer() {
  const db = createDb(null, () => TEST_NOW)
  const controls: MockControls = { fail: false, latency: 0 }
  const server = setupServer(...createHandlers(db, API_URL, controls))
  return { server, db, controls }
}
