import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'
import { approveTeacherByAuth0Id, getTestAuth0UserId } from '../helpers/db-helper'
import { mockAiStream, EXERCISES_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test('exercises render as quiz in editor and student can complete them', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()
  await mockAiStream(page, EXERCISES_FIXTURE)

  // Create a lesson
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-grammar-focus').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
  const lessonTitle = `Exercises Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)

  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()

  await page.getByTestId('input-topic').fill('Past simple exercises')

  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()

  await page.getByTestId('submit-lesson').click()

  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  // Save a note in the Practice section to persist it in the DB
  // Practice section defaults to 'exercises' task type in GeneratePanel
  const practiceSection = page.getByTestId('section-practice')
  await practiceSection.fill('Controlled practice exercises.')
  await practiceSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Approve teacher before generating
  await approveTeacherByAuth0Id(getTestAuth0UserId())

  // Generate exercises via the Practice section
  await page.getByTestId('generate-btn-practice').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('generate-btn').click()

  // Wait for streaming to complete and insert
  await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('insert-btn').click()

  // Content block should appear
  await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Exercises should render as the structured editor (not raw textarea)
  await expect(page.getByTestId('exercises-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Navigate to student study view
  await page.getByTestId('preview-student-btn').click()
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('study-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  // Exercises should render as the interactive student component
  await expect(page.getByTestId('exercises-student').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  const student = page.getByTestId('exercises-student').first()

  // Fill in the blank: correct answer
  await student.getByTestId('fib-input-0').fill('went')

  // Multiple choice: select "glad" (index 1)
  await student.getByTestId('mc-option-0-1').check()

  // Matching: select "hola" for "hello"
  await student.getByTestId('match-select-0').selectOption('hola')
  // Select "adios" for "goodbye"
  await student.getByTestId('match-select-1').selectOption('adios')

  // Check all answers
  await student.getByTestId('check-answers-btn').click()

  // Score summary: 1 FIB + 1 MC + 2 matching = 4 questions
  await expect(student.getByTestId('score-summary')).toHaveText('You got 4 / 4 correct', { timeout: UI_TIMEOUT })

  // FIB result shows correct
  await expect(student.getByTestId('fib-result-0')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(student.getByTestId('fib-result-0')).toHaveText('✓')

  // Try Again resets the form
  await student.getByTestId('try-again-btn').click()
  await expect(student.getByTestId('check-answers-btn')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(student.getByTestId('fib-input-0')).toHaveValue('')
})
