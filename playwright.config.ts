import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-тесты: настоящий браузер против собранного приложения (vite preview).
 * Сервер — тот же MSW в Service Worker, что и на GitHub Pages: тесты проверяют
 * ровно то, что увидит пользователь.
 */
const local = !process.env.CI

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !local,
  retries: local ? 0 : 1,
  reporter: local ? 'list' : [['github'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
  },
  projects: [
    // Локально — установленный Google Chrome (не скачивать отдельный Chromium),
    // в CI — Chromium из `npx playwright install`.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: local ? 'chrome' : undefined }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: local ? 'chrome' : undefined }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: local,
    timeout: 120_000,
  },
})
