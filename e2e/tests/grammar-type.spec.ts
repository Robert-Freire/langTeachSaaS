import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, GRAMMAR_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('grammar type renders editor and student view', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await mockAiStream(page, GRAMMAR_FIXTURE)

    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Grammar Type Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Present simple tense')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save Production section notes (defaults to grammar task type)
    const productionSection = page.getByTestId('section-production')
    await productionSection.fill('Teach present simple tense rules and usage.')
    await productionSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Open generate panel for Production section (defaults to grammar)
    await page.getByTestId('generate-btn-production').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Trigger generation
    await page.getByTestId('generate-btn').click()

    // Wait for streaming to complete
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })
    await page.getByTestId('insert-btn').click()

    // Content block should appear
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Grammar should render as structured editor (not raw JSON)
    await expect(page.getByTestId('grammar-title-input').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('grammar-title-input').first()).toHaveValue('Present Simple')

    // Switch to Preview mode to verify rendered content
    const contentBlock = page.getByTestId('content-block').first()
    await contentBlock.getByText('Preview').click()
    await expect(page.getByTestId('grammar-preview').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByText('Used to describe habits, facts, and routines.')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('She drinks coffee every morning.')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Forgetting the -s ending for he/she/it')).toBeVisible({ timeout: UI_TIMEOUT })

    // Navigate to student study view
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    // Student view should show grammar renderer
    const grammarStudent = page.getByTestId('grammar-student').first()
    await expect(grammarStudent).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Verify student content
    await expect(grammarStudent.getByRole('heading', { name: 'Present Simple' })).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(grammarStudent.getByText('Watch out!')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(grammarStudent.getByText('Forgetting the -s ending for he/she/it')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
