import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('sidebar hides Lessons but /lessons route still renders', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    const sidebar = page.locator('aside').first()
    const navLinks = sidebar.locator('a')
    const labels = (await navLinks.allTextContents()).map(s => s.trim())

    expect(labels).not.toContain('Lessons')
    expect(labels).toEqual(['Dashboard', 'Students', 'Sessions', 'Courses', 'Settings'])

    await page.goto('/lessons')
    await expect(page).toHaveURL(/\/lessons$/, { timeout: NAV_TIMEOUT })
    await expect(page.locator('body')).toBeVisible({ timeout: UI_TIMEOUT })
    expect(page.url()).toContain('/lessons')
  } finally {
    await context.close()
  }
})
