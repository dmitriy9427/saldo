/**
 * Скриншоты для README: npm run build && node scripts/screenshots.mjs
 * Поднимает vite preview, открывает страницы в Chrome (Playwright) в светлой
 * и тёмной теме, сохраняет WebP в docs/screenshots. WebP кодирует сам Chrome
 * (canvas → image/webp): отдельный конвертер ставить не нужно.
 */
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { chromium } from '@playwright/test'

const PORT = 4174
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await sleep(1500)

const browser = await chromium.launch({ channel: 'chrome' })
const shots = [
  { name: 'dashboard-dark', path: '/', theme: 'dark', width: 1440, height: 1100 },
  { name: 'dashboard-light', path: '/', theme: 'light', width: 1440, height: 1100 },
  { name: 'transactions', path: '/transactions', theme: 'dark', width: 1440, height: 1000 },
  { name: 'form', path: '/transactions', theme: 'dark', width: 1440, height: 1000, action: async (page) => {
    await page.keyboard.press('n')
    await page.getByLabel('Сумма').fill('1 250,5')
    await page.locator('dialog label', { hasText: 'Кафе и рестораны' }).click()
    await page.getByLabel('Заметка').fill('Ужин с друзьями')
    await sleep(300)
  } },
  { name: 'budgets', path: '/budgets', theme: 'light', width: 1440, height: 1000 },
  { name: 'accounts', path: '/accounts', theme: 'dark', width: 1440, height: 1000 },
  { name: 'import', path: '/import', theme: 'light', width: 1440, height: 1000, action: async (page) => {
    await page.getByRole('button', { name: 'Попробовать на примере' }).click()
    await page.getByRole('button', { name: 'Дальше' }).click()
  } },
  { name: 'mobile', path: '/', theme: 'light', width: 390, height: 844, mobile: true },
]

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.mobile ? 3 : 2,
    isMobile: Boolean(shot.mobile),
    hasTouch: Boolean(shot.mobile),
    colorScheme: shot.theme,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  })
  const page = await context.newPage()
  await page.goto(`http://localhost:${PORT}${shot.path}`)
  await page.locator('.boot').waitFor({ state: 'detached' })
  await page.waitForLoadState('networkidle')
  await sleep(1200) // анимации графиков
  await shot.action?.(page)
  await sleep(400)
  const png = await page.screenshot()
  await writeFile(`docs/screenshots/${shot.name}.webp`, await toWebp(page, png, shot.mobile ? 780 : 1600))
  await context.close()
  console.log('✓', shot.name)
}

await browser.close()
server.kill()

/** PNG → WebP нужной ширины средствами браузера. */
async function toWebp(page, png, width) {
  const base64 = await page.evaluate(
    async ({ data, width }) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const height = Math.round((bitmap.height * width) / bitmap.width)
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, width, height)
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
      const buffer = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
      return btoa(binary)
    },
    { data: png.toString('base64'), width },
  )
  return Buffer.from(base64, 'base64')
}
