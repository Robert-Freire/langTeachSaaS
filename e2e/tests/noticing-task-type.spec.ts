import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, NOTICING_TASK_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createLessonWithNoticingTask(browser: Parameters<typeof createMockAuthContext>[0]) {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await mockAiStream(page, NOTICING_TASK_FIXTURE)

  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-grammar-focus').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
  await page.getByTestId('input-title').fill(`Noticing Task Test ${Date.now()}`)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Past tense discovery')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()
  await page.getByTestId('submit-lesson').click()

  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })

  // Use presentation section for noticing task
  const presentationSection = page.getByTestId('section-presentation')
  await presentationSection.fill('Grammar discovery activity.')
  await presentationSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('generate-btn-presentation').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  // Wait for content-type rules to load so task type is resolved before generating
  await expect(page.getByTestId('task-type-loading')).not.toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('generate-btn').click()

  return { page, context }
}

test.describe('Noticing Task content type', () => {
  test('generates and renders noticing task content', async ({ browser }) => {
    test.setTimeout(TEST_TIMEOUT)
    const { page, context } = await createLessonWithNoticingTask(browser)

    try {
      // Wait for AI stream to complete and verify instruction is displayed
      await expect(page.getByText('Find all the verbs in the past tense')).toBeVisible({
        timeout: FEEDBACK_TIMEOUT,
      })

      // Verify the passage text is present
      await expect(page.getByText('Ayer Maria fue al mercado')).toBeVisible()

      // Verify discovery questions are shown
      await expect(
        page.getByText('How many past tense verbs did you find?'),
      ).toBeVisible()
    } finally {
      await page.close()
      await context.close()
    }
  })
})
