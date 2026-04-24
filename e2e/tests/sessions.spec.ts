import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('sessions page renders with sections', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/sessions')
    await expect(page.locator('h1')).toHaveText('Sessions', { timeout: NAV_TIMEOUT })

    // Either sessions list or empty state must appear
    const content = page.locator('[data-testid="sessions-list"], [data-testid="sessions-empty"]')
    await expect(content.first()).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sessions page shows recent sessions for Diego Seed', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/sessions')
    await expect(page.locator('h1')).toHaveText('Sessions', { timeout: NAV_TIMEOUT })

    // Diego Seed has sessions at -14 and -7 days (Recent section)
    // At least one session row for Diego Seed should be visible
    const sessionsList = page.getByTestId('sessions-list')
    await expect(sessionsList).toBeVisible({ timeout: UI_TIMEOUT })

    // The Recent section header must be present
    const recentHeader = page.getByText('Recent', { exact: true })
    await expect(recentHeader).toBeVisible({ timeout: UI_TIMEOUT })

    // Diego Seed should appear in session rows
    const diegoRows = page.getByText('Diego Seed')
    await expect(diegoRows.first()).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sessions filter by student narrows results', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/sessions')
    await expect(page.locator('h1')).toHaveText('Sessions', { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('sessions-list')).toBeVisible({ timeout: UI_TIMEOUT })

    // Open the student filter
    const filterTrigger = page.getByTestId('student-filter')
    await expect(filterTrigger).toBeVisible({ timeout: UI_TIMEOUT })

    await filterTrigger.click()

    // Select Diego Seed from the dropdown
    const diegoOption = page.getByRole('option', { name: 'Diego Seed' })
    await expect(diegoOption).toBeVisible({ timeout: UI_TIMEOUT })
    await diegoOption.click()

    // After filtering, the page should render either a session list or empty state
    // If sessions are present, every row must belong to Diego Seed
    const content = page.locator('[data-testid="sessions-list"], [data-testid="sessions-empty"]')
    await expect(content.first()).toBeVisible({ timeout: UI_TIMEOUT })

    const rows = page.locator('[data-testid^="session-row-"]')
    const rowCount = await rows.count()
    if (rowCount > 0) {
      const rowTexts = await rows.allTextContents()
      expect(rowTexts.every(t => t.includes('Diego Seed'))).toBe(true)
    }
  } finally {
    await context.close()
  }
})

test('clicking session row navigates to LogSession edit mode', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/sessions')
    await expect(page.locator('h1')).toHaveText('Sessions', { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('sessions-list')).toBeVisible({ timeout: UI_TIMEOUT })

    // Click the first session row
    const firstRow = page.locator('[data-testid^="session-row-"]').first()
    await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT })
    await firstRow.click()

    // Should navigate to LogSession in edit mode
    await expect(page).toHaveURL(/\/students\/.+\/sessions\/.+\/edit/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sessions nav item visible in sidebar', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Desktop sidebar contains Sessions link
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: 'Sessions' })).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
