import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'
import { createStudentViaUI } from '../helpers/students'

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
    await createStudentViaUI(page, { name: studentName, language: 'Spanish', cefrLevel: 'A1', nativeLanguage: 'English' })
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
