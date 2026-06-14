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

test('Groups sidebar entry navigates to /groups and renders the list screen', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    const sidebar = page.locator('aside').first()
    await sidebar.getByRole('link', { name: /^groups$/i }).click()
    await expect(page).toHaveURL(/\/groups$/, { timeout: NAV_TIMEOUT })

    await expect(page.getByRole('heading', { level: 1, name: 'Groups' })).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('add-group-button')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('add-group-button')).toBeDisabled()
  } finally {
    await context.close()
  }
})

test('Groups empty state renders when teacher has no groups', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/groups')
    await expect(page).toHaveURL(/\/groups$/, { timeout: NAV_TIMEOUT })

    // Mock teacher starts with zero groups, so the empty-state should render.
    await expect(page.getByTestId('groups-empty-state')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('No groups yet')).toBeVisible()

    // The empty card MUST NOT contain a CTA (toolbar Add Group is outside).
    const emptyCard = page.getByTestId('groups-empty-state')
    await expect(emptyCard.locator('button')).toHaveCount(0)
    await expect(emptyCard.locator('a')).toHaveCount(0)
  } finally {
    await context.close()
  }
})
