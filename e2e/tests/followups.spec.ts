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

test('followup happy path: create, appear on dashboard, mark done', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Step 1: Create a student to attach the followup to
    const studentName = `Followup Test ${Date.now()}`
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
    await page.getByTestId('student-name').fill(studentName)
    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()
    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'A1' }).click()
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Save Student' }).click()

    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('tab-profile')).toBeVisible({ timeout: UI_TIMEOUT })

    // Step 2: Add a followup from the Profile tab
    const followupText = `Enviar ejercicio de practica ${Date.now()}`
    await expect(page.getByTestId('student-followups-card')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('followup-input').fill(followupText)
    await page.getByTestId('followup-add-btn').click()

    // Followup appears in the card
    await expect(page.getByText(followupText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Step 3: Navigate to dashboard and verify followup appears in Pending Followups panel
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('zone2-pending-followups')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText(followupText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Step 4: Mark as done from the dashboard - find the dot next to our followup text
    const panel = page.getByTestId('zone2-pending-followups')
    const followupRow = panel.locator('div').filter({ hasText: followupText }).first()
    await followupRow.getByLabel('Mark done').click()

    // Followup disappears from pending list (or panel shows "All caught up" if no other followups)
    await expect(page.getByText(followupText)).not.toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await page.close()
    await context.close()
  }
})
