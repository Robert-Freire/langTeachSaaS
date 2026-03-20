import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { READING_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('reading type renders editor and student view', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Mock only the reading stream endpoint (not wildcard) to verify correct task route
    await page.route('**/api/generate/reading/stream', async (route) => {
      const token = JSON.stringify(JSON.stringify(READING_FIXTURE))
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        body: `data: ${token}\n\ndata: [DONE]\n\n`,
      })
    })

    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Reading Type Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Technology and communication')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save Presentation section notes
    const presentationSection = page.getByTestId('section-presentation')
    await presentationSection.fill('Reading passage about smartphone communication.')
    await presentationSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Open generate panel for Presentation section
    await page.getByTestId('generate-btn-presentation').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Change task type to Reading (Presentation defaults to vocabulary)
    const generatePanel = page.getByTestId('generate-panel')
    await generatePanel.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Reading' }).click()

    // Trigger generation
    await page.getByTestId('generate-btn').click()

    // Wait for streaming to complete
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('insert-btn').click()

    // Content block should appear
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Reading should render as structured editor (not raw JSON)
    await expect(page.getByTestId('reading-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('reading-passage-input').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Switch to Preview mode to verify rendered content
    const contentBlock = page.getByTestId('content-block').first()
    await contentBlock.getByText('Preview').click()
    await expect(page.getByTestId('reading-preview').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify passage text renders in preview (fixes #117: passage was empty during streaming)
    await expect(page.getByText('Smartphones have changed the way we communicate.')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('How have smartphones changed communication?')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('ubiquitous', { exact: true })).toBeVisible({ timeout: UI_TIMEOUT })

    // Navigate to student study view
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    // Student view should show reading renderer
    const readingStudent = page.getByTestId('reading-student').first()
    await expect(readingStudent).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify student content: passage, questions, and vocabulary
    await expect(readingStudent.getByText('Smartphones have changed the way we communicate.')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(readingStudent.getByText('How have smartphones changed communication?')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(readingStudent.getByText('Key Vocabulary')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(readingStudent.getByText('ubiquitous', { exact: true })).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(readingStudent.getByText('revolutionize', { exact: true })).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
