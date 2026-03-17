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

test('regenerate with direction sends direction in request and shows badge', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
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
    const lessonTitle = `Direction Test ${Date.now()}`
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

    // Now test regenerate with direction
    // Set up request interception to verify direction is sent
    let capturedDirection: string | undefined
    await page.route('**/api/generate/*/stream', async (route) => {
      const postData = route.request().postDataJSON()
      capturedDirection = postData?.direction
      // Continue to the real server
      await route.continue()
    })

    // Click the direction dropdown (chevron button)
    await page.getByTestId('direction-trigger').click()
    await expect(page.getByTestId('direction-options')).toBeVisible({ timeout: UI_TIMEOUT })

    // Click "Make it easier"
    await page.getByTestId('direction-make-it-easier').click()

    // GeneratePanel should open with direction badge visible
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('direction-badge')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('direction-badge')).toContainText('Make it easier')

    // Click Generate and verify streaming begins with direction in request
    await page.getByTestId('generate-btn').click()
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })

    // Verify the direction was sent in the API request
    expect(capturedDirection).toBe('Make it easier')
  } finally {
    await context.close()
  }
})
