import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { TEST_TIMEOUT, AI_STREAM_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('generate AI content for lesson section, insert, and persist after refresh', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a lesson via the wizard
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

  // Pick any template (Grammar Focus)
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-grammar-focus').click()

  // Fill in lesson metadata
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
  const lessonTitle = `AI Generate Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)

  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()

  await page.getByTestId('input-topic').fill('Travel vocabulary')

  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()

  await page.getByTestId('submit-lesson').click()

  // Should be on lesson editor
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  // Save section notes once so sections are persisted in DB (required for sectionId to exist)
  const presentationSection = page.getByTestId('section-presentation')
  await presentationSection.fill('Key travel vocabulary items.')
  await presentationSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Click Generate on the Presentation section
  await page.getByTestId('generate-btn-presentation').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Vocabulary should be pre-selected for the Presentation section
  // Click Generate
  await page.getByTestId('generate-btn').click()

  // Wait for streaming to complete — "Insert into section" button appears
  await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })

  // Generated output should have content
  const output = page.getByTestId('generate-output')
  await expect(output).not.toBeEmpty({ timeout: FEEDBACK_TIMEOUT })

  // Insert into section
  await page.getByTestId('insert-btn').click()

  // Generate panel should close and content block appear
  await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Reload and confirm the block is still there (persisted)
  await page.reload()
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: UI_TIMEOUT })
})
