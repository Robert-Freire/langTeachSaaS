import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

test.beforeAll(async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })

  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('@visual sessions list - full page with recent sessions', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/sessions')
  await expect(page.locator('h1')).toContainText('Sessions', { timeout: NAV_TIMEOUT })

  // Wait for either sessions list or empty state
  const content = page.locator('[data-testid="sessions-list"], [data-testid="sessions-empty"]')
  await expect(content.first()).toBeVisible({ timeout: UI_TIMEOUT })

  await page.screenshot({ path: 'screenshots/sessions-list.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual sessions list - sidebar nav item highlighted', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/sessions')
  await expect(page.locator('h1')).toContainText('Sessions', { timeout: NAV_TIMEOUT })

  // Desktop sidebar Sessions link should be active
  const sidebar = page.locator('aside')
  const sessionsLink = sidebar.getByRole('link', { name: 'Sessions' })
  await expect(sessionsLink).toBeVisible({ timeout: UI_TIMEOUT })

  await page.screenshot({ path: 'screenshots/sessions-nav-active.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
