import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages отдаёт сайт из подпапки /saldo/ — base задаётся переменной окружения,
// локально всё работает с корня.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Помощники тестов (store + MSW): import { setupApi } from 'test-utils'.
      'test-utils': fileURLToPath(new URL('./test/utils.tsx', import.meta.url)),
    },
  },
  build: {
    // Самый большой файл — демо-сервер MSW (~560 КБ без сжатия, ~150 КБ gzip);
    // в приложение с настоящим бэкендом он не попадает.
    chunkSizeWarningLimit: 600,
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/shared/config/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
