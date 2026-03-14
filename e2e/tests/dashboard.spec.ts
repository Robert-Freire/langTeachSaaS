import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('dashboard tiles navigate to correct routes', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })

  // Students tile -> /students (target the tile specifically via its subtitle text)
  await page.locator('a[href="/students"]').filter({ hasText: 'View all students' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 10000 })

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  // Lessons tile -> /lessons
  await page.getByTestId('lessons-tile').click()
  await expect(page).toHaveURL('/lessons', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  // Active plans tile -> /lessons
  await page.getByTestId('active-plans-tile').click()
  await expect(page).toHaveURL('/lessons', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })

  await context.close()
})
