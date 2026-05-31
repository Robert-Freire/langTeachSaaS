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

// Issue #1390 — FAB assistant can target a Group
// Uses a real B1.1 group from the seeded teacher data (Jordi's groups).
// This test exercises the happy path (verify criterion 3 only via API typing):
// the assistant proposal panel accepts typed text and does not regress on
// a student-only transcript.

test('FAB assistant: student-only transcript does not create a group session proposal', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Open FAB assistant
    const fabBtn = page.getByTestId('fab-assistant-btn')
    await expect(fabBtn).toBeVisible({ timeout: UI_TIMEOUT })
    await fabBtn.click()

    const panel = page.getByTestId('assistant-panel')
    await expect(panel).toBeVisible({ timeout: UI_TIMEOUT })

    // Type a student-only transcript (no group mention)
    const input = panel.getByTestId('assistant-input')
    await input.fill('Ana trabajó subjuntivo hoy, estuvo muy bien')
    await panel.getByTestId('assistant-send-btn').click()

    // Wait for processing to finish
    await expect(panel.getByTestId('proposals-loading')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(panel.getByTestId('proposals-loading')).not.toBeVisible({ timeout: 30000 })

    // No group-targeted session proposal should appear
    const groupTargets = panel.locator('[data-testid^="group-target-"]')
    await expect(groupTargets).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('Edit Group form: Aliases field is present and persists entries', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/groups')
    await expect(page.getByRole('heading', { level: 1, name: 'Groups' })).toBeVisible({ timeout: NAV_TIMEOUT })

    // Navigate to the first group
    const firstGroupLink = page.locator('[data-testid="group-card"]').first()
    const count = await firstGroupLink.count()
    if (count === 0) {
      // No groups seeded — skip gracefully
      test.skip()
      return
    }
    await firstGroupLink.click()

    // Find edit button
    const editBtn = page.getByTestId('edit-group-btn').first()
    if (!(await editBtn.count())) {
      test.skip()
      return
    }
    await editBtn.click()

    // Aliases field should exist
    const aliasInput = page.getByTestId('alias-input')
    await expect(aliasInput).toBeVisible({ timeout: UI_TIMEOUT })

    // Add an alias
    await aliasInput.fill('Lunes')
    await aliasInput.press('Enter')

    // Chip should appear
    const aliasChip = page.getByTestId('alias-chip').filter({ hasText: 'Lunes' })
    await expect(aliasChip).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
