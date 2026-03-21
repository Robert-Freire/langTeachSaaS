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

test('difficulty badges appear after generating content for a student with difficulties', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // 1. Create a student with difficulties
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })

    const studentName = `Difficulty Test ${Date.now()}`
    await page.getByTestId('student-name').fill(studentName)

    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()

    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'B1' }).click()

    // Add a structured difficulty
    const addDiffBtn = page.getByTestId('add-difficulty')
    await addDiffBtn.scrollIntoViewIfNeeded()
    await addDiffBtn.click()
    const diffRow = page.getByTestId('difficulty-row').first()
    await expect(diffRow).toBeVisible({ timeout: UI_TIMEOUT })

    await diffRow.getByTestId('difficulty-item').fill('ser/estar in past tense')
    await diffRow.getByTestId('difficulty-category').click()
    await page.getByRole('option', { name: 'Grammar' }).click()
    await diffRow.getByTestId('difficulty-severity').click()
    await page.getByRole('option', { name: 'High' }).click()
    await diffRow.getByTestId('difficulty-trend').click()
    await page.getByRole('option', { name: 'Stable' }).click()

    await page.getByRole('button', { name: 'Save Student' }).click()
    await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

    // 2. Create a lesson linked to this student
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Diff Targeting ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Past tense review')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    // Link student
    await page.getByTestId('select-student').click()
    await page.getByRole('option', { name: studentName }).click()

    await page.getByTestId('submit-lesson').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // 3. Save section notes (required for sectionId)
    const presentationSection = page.getByTestId('section-presentation')
    await presentationSection.fill('Review of past tense.')
    await presentationSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // 4. Intercept the stream to provide a fast mock response
    await page.route('**/api/generate/vocabulary/stream', async (route) => {
      const sseBody = [
        `data: ${JSON.stringify(JSON.stringify({ items: [{ word: 'fue', definition: 'was (ser)', exampleSentence: 'El viaje fue largo.' }] }))}\n\n`,
        'data: [DONE]\n\n',
      ].join('')

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: sseBody,
      })
    })

    // 5. Generate content
    await page.getByTestId('generate-btn-presentation').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('generate-btn').click()

    // Wait for generation to complete
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: AI_STREAM_TIMEOUT })

    // 6. Verify difficulty badges appear in the generated preview
    await expect(page.getByTestId('targeted-difficulties')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('difficulty-badge').first()).toContainText('[grammar]')
    await expect(page.getByTestId('difficulty-badge').first()).toContainText('ser/estar in past tense')

    // 7. Insert the block and verify badges persist on the content block
    await page.getByTestId('insert-btn').click()
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('content-block')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('targeted-difficulties')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('difficulty-badge').first()).toContainText('[grammar]')
  } finally {
    await context.close()
  }
})
