import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockFullLessonStreams } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT, GENERATION_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('generate full lesson populates all 5 sections', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await mockFullLessonStreams(page)

    // Create a new lesson via wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Full Lesson Gen Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'A2' }).click()

    await page.getByTestId('input-topic').fill('Food vocabulary')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    // Should land on lesson editor
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Click Generate Full Lesson
    await page.getByTestId('generate-full-lesson-btn').click()
    await expect(page.getByText('Generate Full Lesson?')).toBeVisible({ timeout: UI_TIMEOUT })

    // Confirm
    await page.getByTestId('confirm-generate-full-lesson').click()
    await expect(page.getByTestId('generation-progress')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Wait for all 5 sections to complete (done dialog state)
    await expect(page.getByText('Lesson generated!')).toBeVisible({ timeout: GENERATION_TIMEOUT })

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click()

    // Each of the 5 sections should have at least one content block badge
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: UI_TIMEOUT })
    const badges = page.getByTestId('ai-block-badge')
    await expect(badges).toHaveCount(5, { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
