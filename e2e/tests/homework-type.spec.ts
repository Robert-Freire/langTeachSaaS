import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, HOMEWORK_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('homework type renders editor and student view', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await mockAiStream(page, HOMEWORK_FIXTURE)

    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Homework Type Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Daily routines')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save WrapUp section note so section exists in DB
    const wrapupSection = page.getByTestId('section-wrapup')
    await wrapupSection.fill('Assign homework for daily routines practice.')
    await wrapupSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Generate homework via WrapUp section (defaults to homework task type)
    await page.getByTestId('generate-btn-wrapup').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('generate-btn').click()

    // Wait for streaming and insert
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('insert-btn').click()

    // Content block should appear
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Homework should render as structured editor (not raw JSON)
    await expect(page.getByTestId('homework-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Fixture task type and instructions visible in editor
    await expect(page.getByTestId('homework-task-type-0').first()).toHaveValue('writing', { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('homework-task-instructions-0').first()).toHaveValue('Write 5 sentences using the present simple to describe your daily routine.', { timeout: UI_TIMEOUT })

    // Navigate to student study view
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    // Student view should show homework renderer
    await expect(page.getByTestId('homework-student').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Task labels and content visible
    await expect(page.getByText('Task 1:').first()).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('writing').first()).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Write 5 sentences using the present simple').first()).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('I wake up at 7am.').first()).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
