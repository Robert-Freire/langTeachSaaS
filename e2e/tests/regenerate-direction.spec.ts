import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { sseRoute, GRAMMAR_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, AI_STREAM_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('regenerate replaces existing content and sends direction', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Mock the AI stream endpoint and capture direction param
    let capturedDirection: string | undefined
    await page.route('**/api/generate/*/stream', async (route) => {
      const postData = route.request().postDataJSON()
      if (postData?.direction !== undefined) {
        capturedDirection = postData.direction
      }
      await route.fulfill(sseRoute(GRAMMAR_FIXTURE))
    })

    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    // Pick any template
    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    // Fill in lesson metadata
    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Regen Replace Test ${Date.now()}`
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

    // Save section notes so sectionId exists
    const presentationSection = page.getByTestId('section-presentation')
    await presentationSection.fill('Vocabulary about daily routines.')
    await presentationSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Generate initial content for Presentation section
    await page.getByTestId('generate-btn-presentation').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('generate-btn').click()
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })
    await page.getByTestId('insert-btn').click()
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Count initial content blocks
    const initialBlockCount = await page.getByTestId('content-block').count()
    expect(initialBlockCount).toBeGreaterThan(0)

    // Click Regenerate on the content block to open the unified panel
    await page.getByTestId('regenerate-btn').click()

    // Panel should open with replace indicator and direction textarea
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('replace-indicator')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('direction-textarea')).toBeVisible({ timeout: UI_TIMEOUT })

    // Click a direction chip
    await page.getByTestId('direction-chip-make-it-easier').click()
    const textarea = page.getByTestId('direction-textarea')
    await expect(textarea).toHaveValue('Make it easier')

    // Insert button not visible until generation completes
    await expect(page.getByTestId('insert-btn')).not.toBeVisible()

    // Generate with direction
    await page.getByTestId('generate-btn').click()
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })

    // Verify insert button text
    await expect(page.getByTestId('insert-btn')).toHaveText('Replace & insert')

    // Click replace & insert
    await page.getByTestId('insert-btn').click()
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify the direction was sent in the API request
    expect(capturedDirection).toBe('Make it easier')

    // Content block should still be visible (replaced, not duplicated)
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    const finalBlockCount = await page.getByTestId('content-block').count()
    expect(finalBlockCount).toBe(initialBlockCount)
  } finally {
    await context.close()
  }
})
