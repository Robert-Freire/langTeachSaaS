import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, SENTENCE_TRANSFORMATION_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createLessonWithSentenceTransformation(browser: Parameters<typeof createMockAuthContext>[0]) {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await mockAiStream(page, SENTENCE_TRANSFORMATION_FIXTURE)

  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-grammar-focus').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
  await page.getByTestId('input-title').fill(`Sentence Transformation Test ${Date.now()}`)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Past tense transformations')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()
  await page.getByTestId('submit-lesson').click()

  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })

  const practiceSection = page.getByTestId('section-practice')
  await practiceSection.fill('Transformation practice.')
  await practiceSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('generate-btn-practice').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('generate-btn').click()

  await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('insert-btn').click()
  await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  return { context, page }
}

test('sentence transformation exercises render in editor', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceTransformation(browser)

  try {
    await expect(page.getByTestId('exercises-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('exercises-editor').getByText('Sentence Transformation')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student can complete sentence transformation with correct answer', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceTransformation(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Type the expected answer for item 0
    await student.getByTestId('st-input-0').fill('Maria salio de casa a las ocho.')

    await student.getByTestId('check-answers-btn').click()

    await expect(student.getByTestId('st-result-0')).toContainText('Correct', { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student gets correct with alternative answer', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceTransformation(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Type an alternative answer for item 0
    await student.getByTestId('st-input-0').fill('Maria salia de casa a las ocho.')

    await student.getByTestId('check-answers-btn').click()

    await expect(student.getByTestId('st-result-0')).toContainText('Correct', { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('wrong sentence transformation answer shows model answer', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceTransformation(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    await student.getByTestId('st-input-0').fill('wrong answer')
    await student.getByTestId('check-answers-btn').click()

    await expect(student.getByTestId('st-result-0')).toContainText('✗', { timeout: UI_TIMEOUT })
    await expect(student.getByTestId('st-result-0')).toContainText('Maria salio de casa a las ocho.', { timeout: UI_TIMEOUT })
    await expect(student.getByTestId('st-explanation-0')).toContainText('preterito', { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
