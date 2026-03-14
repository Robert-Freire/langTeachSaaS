import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('dashboard tiles navigate to correct routes', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })

  // Students tile -> /students
  await page.getByRole('link', { name: /students/i }).first().click()
  await expect(page).toHaveURL('http://localhost:5173/students', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 10000 })

  await page.goto('http://localhost:5173/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  await context.close()
})
