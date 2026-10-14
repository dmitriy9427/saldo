import { type Page, expect, test } from '@playwright/test'

/** Открыть страницу и дождаться, пока демо-сервер (MSW) ответит на первые запросы. */
async function openApp(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.locator('.boot')).toHaveCount(0)
}

test.describe('Сальдо', () => {
  test('главная: карточки месяца, график, категории, бюджеты', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeVisible()
    await expect(page.getByText('На всех счетах')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Доходы и расходы' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Расходы по категориям' })).toBeVisible()
    await expect(page.getByRole('meter').first()).toBeVisible()
  })

  test('новая операция по клавише N появляется в списке и переживает перезагрузку', async ({ page }) => {
    await openApp(page, '/transactions')
    await page.keyboard.press('n')
    const dialog = page.getByRole('dialog', { name: 'Новая операция' })
    await expect(dialog.getByLabel('Сумма')).toBeFocused()
    await dialog.getByLabel('Сумма').fill('321,5')
    // Кликаем по «чипу» категории, как пользователь (сама радиокнопка скрыта визуально).
    await dialog.locator('label', { hasText: 'Подарки' }).click()
    await expect(dialog.getByRole('radio', { name: 'Подарки' })).toBeChecked()
    await dialog.getByLabel('Заметка').fill('Цветы из e2e')
    await dialog.getByRole('button', { name: 'Добавить' }).click()

    await expect(page.getByRole('status').getByText('Добавлено: 321,50 ₽')).toBeVisible()
    await expect(page.getByText('Цветы из e2e')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Цветы из e2e')).toBeVisible()
  })

  test('клик по категории на главной открывает её операции (фильтр в адресе)', async ({ page }) => {
    await openApp(page)
    await page.getByRole('link', { name: /Продукты/ }).first().click()
    await expect(page).toHaveURL(/category=groceries/)
    await expect(page.getByLabel('Категория')).toHaveValue('groceries')
    const rows = page.locator('main li')
    await expect(rows.first()).toContainText('Продукты')
  })

  test('удаление с отменой', async ({ page }) => {
    await openApp(page, '/transactions')
    const first = page.locator('main li').first()
    // Ждём, пока подтянутся и счета (« · Основная карта»), и категории (вместо «…»):
    // строка собрана полностью. В CI запросы приходят в разном порядке.
    await expect(first).toContainText(' · ')
    await expect(first).not.toContainText('…')
    const title = (await first.textContent()) ?? ''
    await first.hover()
    await first.getByRole('button', { name: 'Удалить операцию' }).click()
    await expect(page.locator('main li').first()).not.toHaveText(title)
    await page.getByRole('button', { name: 'Отменить' }).click()
    await expect(page.locator('main li').first()).toHaveText(title)
  })

  test('импорт выписки на примере', async ({ page }) => {
    await openApp(page, '/import')
    await page.getByRole('button', { name: 'Попробовать на примере' }).click()
    await page.getByRole('button', { name: 'Дальше' }).click()
    await page.getByRole('button', { name: /Импортировать \d+ операци/ }).click()
    await expect(page.getByText(/Добавлено операций: \d+/)).toBeVisible()
  })

  test('телефон: вкладки внизу и кнопка «+» @mobile', async ({ page }) => {
    await openApp(page)
    const tabs = page.getByRole('navigation', { name: 'Разделы' }).last()
    await expect(tabs).toBeVisible()
    await page.getByRole('button', { name: 'Новая операция' }).click()
    await expect(page.getByRole('dialog', { name: 'Новая операция' })).toBeVisible()
    await page.keyboard.press('Escape')
    // Нет горизонтальной прокрутки ни на одной странице.
    for (const path of ['/', '/transactions', '/budgets', '/accounts', '/import']) {
      await openApp(page, path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
  })

  test('телефон: нижнее меню уезжает при прокрутке вниз и возвращается вверх @mobile', async ({ page }) => {
    await openApp(page, '/transactions')
    await page.waitForLoadState('networkidle')
    const tabs = page.getByRole('navigation', { name: 'Разделы' }).last()
    const height = page.viewportSize()!.height
    await expect(tabs).toBeInViewport()

    await page.mouse.wheel(0, 500)
    await expect.poll(async () => (await tabs.boundingBox())!.y).toBeGreaterThanOrEqual(height)

    await page.mouse.wheel(0, -200)
    // 0.95, а не 1: у Pixel 7 плотность 2,625 — полпикселя теряется на округлении.
    await expect(tabs).toBeInViewport({ ratio: 0.95 })
  })
})
