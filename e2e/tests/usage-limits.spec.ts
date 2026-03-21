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

test('usage counter is visible in sidebar and increments after generation', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Navigate to dashboard and verify usage indicator is visible
    await page.goto('/')
    await expect(page.getByTestId('usage-indicator')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Read the initial usage count
    const indicatorText = await page.getByTestId('usage-indicator').textContent()
    const initialMatch = indicatorText?.match(/(\d+)\s*\/\s*(\d+)/)
    expect(initialMatch).not.toBeNull()
    const initialUsed = parseInt(initialMatch![1], 10)

    // Create a lesson and generate content
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    // Pick template
    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    // Fill lesson metadata
    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Usage Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)
    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()
    await page.getByTestId('input-topic').fill('Animals')
    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()
    await page.getByTestId('submit-lesson').click()

    // Wait for lesson editor
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })

    // Save section notes to persist sections
    const presentationSection = page.getByTestId('section-presentation')
    await presentationSection.fill('Animal vocabulary.')
    await presentationSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Generate content
    await page.getByTestId('generate-btn-presentation').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('generate-btn').click()
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })
    await page.getByTestId('insert-btn').click()
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify usage counter incremented
    await expect(page.getByTestId('usage-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('usage-indicator')).toContainText(
      `${initialUsed + 1}`,
      { timeout: FEEDBACK_TIMEOUT }
    )

    // Clean up: delete the lesson
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    const lessonCard = page.locator(`[data-testid="lesson-card"]`, { hasText: lessonTitle })
    await lessonCard.getByTestId('delete-lesson-btn').click()
    await page.getByTestId('confirm-delete-btn').click()
    await expect(lessonCard).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  } finally {
    await page.close()
    await context.close()
  }
})
