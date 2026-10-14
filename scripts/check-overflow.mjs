/**
 * Проверка вёрстки на телефоне: node scripts/check-overflow.mjs [адрес]
 * На ширинах 320–414 px ищет элементы, вылезающие за экран или за свою карточку.
 */
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })
let problems = 0
for (const width of [320, 360, 390, 414]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: 'ru-RU' })
  const page = await ctx.newPage()
  for (const path of ['/', '/transactions', '/budgets', '/accounts', '/import']) {
    await page.goto(base + path)
    await page.locator('.boot').waitFor({ state: 'detached' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    const found = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const out = []
      for (const el of document.querySelectorAll('main *')) {
        if (el.closest('svg, [class*=tableWrap], [class*=steps]')) continue // прокручиваются нарочно
        const box = el.getBoundingClientRect()
        if (!box.width) continue
        // Граница — карточка. Строки списков нарочно выходят за свой <li> отрицательным
        // отступом (подсветка при наведении), но не за карточку.
        const card = el.parentElement?.closest('[class*=_card_], [class*=_stat_], [class*=_account_]')
        const limit = card ? Math.min(vw, card.getBoundingClientRect().right) : vw
        if (box.right > limit + 1) out.push(`${el.tagName} «${el.textContent.trim().slice(0, 30)}» +${Math.round(box.right - limit)}px`)
      }
      return out.slice(0, 5)
    })
    if (found.length) {
      problems += found.length
      console.log(`✗ ${width}px ${path}\n   ${found.join('\n   ')}`)
    }
  }
  await ctx.close()
}
await browser.close()
console.log(problems ? `Найдено: ${problems}` : '✓ Ничего не вылезает')
process.exit(problems ? 1 : 0)
