import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('learning target labels: display, edit, persist, and show in study view', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // 1. Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Learning Targets Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Daily routines')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    // Should be on lesson editor
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    const lessonId = page.url().split('/').pop()!

    // 2. Seed learning targets via API (simulates what happens when generating from a curriculum entry)
    const seedResp = await page.request.put(
      `${API_BASE}/api/lessons/${lessonId}/learning-targets`,
      {
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        data: { learningTargets: ['Ser vs Estar', 'Speaking'] },
      }
    )
    expect(seedResp.ok()).toBeTruthy()

    // 3. Reload the lesson editor and verify learning target badges appear
    await page.reload()
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save section notes to create a section block
    const presentationSection = page.getByTestId('section-presentation')
    await presentationSection.fill('Test section notes.')
    await presentationSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Generate a content block to trigger the ContentBlock with learning targets
    await page.getByTestId('generate-btn-presentation').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('generate-btn').click()
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: 60000 })
    await page.getByTestId('insert-btn').click()
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify learning target badges appear in the content block
    const learningTargetsArea = page.getByTestId('learning-targets').first()
    await expect(learningTargetsArea).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(learningTargetsArea.getByText('Ser vs Estar')).toBeVisible()
    await expect(learningTargetsArea.getByText('Speaking')).toBeVisible()

    // 4. Edit the labels: remove one, add a new one
    await page.getByTestId('edit-targets-btn').first().click()
    // Remove 'Speaking' tag
    const removeBtn = page.locator('[aria-label="Remove Speaking"]').first()
    await removeBtn.click()
    // Add a new tag
    const tagInput = page.getByTestId('new-tag-input').first()
    await tagInput.fill('Listening')
    await tagInput.press('Enter')
    // Save
    await page.getByTestId('save-targets-btn').first().click()

    // Verify updated labels
    await expect(learningTargetsArea.getByText('Ser vs Estar')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(learningTargetsArea.getByText('Listening')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(learningTargetsArea.getByText('Speaking')).not.toBeVisible()

    // 5. Reload to verify persistence
    await page.reload()
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })
    const persistedArea = page.getByTestId('learning-targets').first()
    await expect(persistedArea.getByText('Ser vs Estar')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(persistedArea.getByText('Listening')).toBeVisible({ timeout: UI_TIMEOUT })

    // 6. Navigate to study view and verify labels appear (read-only)
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study/, { timeout: UI_TIMEOUT })
    const studyTargets = page.getByTestId('study-learning-targets')
    await expect(studyTargets).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(studyTargets.getByText('Ser vs Estar')).toBeVisible()
    await expect(studyTargets.getByText('Listening')).toBeVisible()
    await expect(studyTargets.getByText('Practices:')).toBeVisible()
  } finally {
    await context.close()
  }
})
