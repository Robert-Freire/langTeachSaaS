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

test('teaching todo does not appear in dashboard pending followups', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Kind Filter Test ${Date.now()}`
    await createStudentViaUI(page, { name: studentName, language: 'Spanish', cefrLevel: 'B1', nativeLanguage: 'English' })

    // Add a teaching todo via the TeachingTodosCard on the overview tab
    const todoText = `Teaching todo ${Date.now()}`
    await page.getByTestId('ideas-add-header-btn').click()
    await page.getByTestId('todo-add-input').fill(todoText)
    await page.getByTestId('todo-add-btn').click()

    // Assert todo IS visible in the teaching-todos-card
    await expect(page.getByTestId('teaching-todos-card').getByText(todoText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Navigate to dashboard and assert todo does NOT appear in pending followups
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('zone2-pending-followups')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('zone2-pending-followups').getByText(todoText)).not.toBeVisible()
  } finally {
    await page.close()
    await context.close()
  }
})

test('clicking followup row text navigates to student overview', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Click Nav Test ${Date.now()}`
    await createStudentViaUI(page, { name: studentName, language: 'Spanish', cefrLevel: 'A2', nativeLanguage: 'English' })

    // Add an operational followup via StudentFollowupsCard on the overview tab
    const followupText = `Clickable followup ${Date.now()}`
    await expect(page.getByTestId('student-followups-card')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('followup-input').fill(followupText)
    await page.getByTestId('followup-add-btn').click()
    await expect(page.getByTestId('student-followups-card').getByText(followupText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Navigate to dashboard and click the followup text link
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })
    const panel = page.getByTestId('zone2-pending-followups')
    await expect(panel.getByText(followupText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Click the text link (data-testid starts with followup-text-link-)
    const textLink = panel.locator('[data-testid^="followup-text-link-"]').filter({ hasText: followupText })
    await textLink.click()

    // Assert navigated to the student detail page
    await expect(page).toHaveURL(/\/students\/[^/]+$/, { timeout: NAV_TIMEOUT })
  } finally {
    await page.close()
    await context.close()
  }
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
