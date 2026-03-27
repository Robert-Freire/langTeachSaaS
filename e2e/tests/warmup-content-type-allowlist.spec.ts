import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('WarmUp generate panel shows Free activity but not Vocabulary or Grammar', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    // Pick any template that includes a WarmUp section
    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    // Fill in lesson metadata with B1 level so conversation is also allowed
    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `WarmUp Allowlist Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Daily routines')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    // Should be on lesson editor
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save WarmUp section notes so section exists in DB (required for generate button to be active)
    const warmupSection = page.getByTestId('section-warmup')
    await warmupSection.fill('An icebreaker about daily routines.')
    await warmupSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Open the generate panel for WarmUp
    await page.getByTestId('generate-btn-warmup').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Check that "Free activity" IS present (either as read-only label or in the dropdown)
    const taskTypeContainer = page.locator('.space-y-1').filter({ has: page.getByText('Task type') })
    const readonlyLabel = taskTypeContainer.locator('[data-testid="task-type-readonly"]')
    const selectTrigger = taskTypeContainer.locator('[data-slot="select-trigger"]')

    const hasReadonly = await readonlyLabel.isVisible()
    const hasSelect = await selectTrigger.isVisible()

    if (hasSelect) {
      // Dropdown case (B1+): open and verify options
      await selectTrigger.click()
      await expect(page.getByRole('option', { name: 'Free activity' })).toBeVisible({ timeout: UI_TIMEOUT })
      // Vocabulary, Grammar, and Exercises must NOT appear in the dropdown
      await expect(page.getByRole('option', { name: 'Vocabulary' })).not.toBeVisible()
      await expect(page.getByRole('option', { name: 'Grammar' })).not.toBeVisible()
      await expect(page.getByRole('option', { name: 'Exercises' })).not.toBeVisible()
      await page.keyboard.press('Escape')
    }

    // Either way, "Free activity" must be the trigger text or the readonly label text
    const triggerOrLabel = hasReadonly ? readonlyLabel : selectTrigger
    await expect(triggerOrLabel).toContainText('Free activity')
  } finally {
    await context.close()
  }
})
