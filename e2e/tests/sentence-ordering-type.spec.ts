import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, SENTENCE_ORDERING_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createLessonWithSentenceOrdering(browser: Parameters<typeof createMockAuthContext>[0]) {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await mockAiStream(page, SENTENCE_ORDERING_FIXTURE)

  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-grammar-focus').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
  await page.getByTestId('input-title').fill(`Sentence Ordering Test ${Date.now()}`)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'A1' }).click()
  await page.getByTestId('input-topic').fill('Present tense word order')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()
  await page.getByTestId('submit-lesson').click()

  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })

  const practiceSection = page.getByTestId('section-practice')
  await practiceSection.fill('Ordering practice.')
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

test('sentence ordering exercises render in editor', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceOrdering(browser)

  try {
    await expect(page.getByTestId('exercises-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByText('Sentence Ordering')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student can complete sentence ordering exercises', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceOrdering(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Sentence ordering item 0: fragments ["en","vivo","Barcelona","yo"], correctOrder=[3,1,0,2]
    // The scrambled display rotates by half (2): shows indices [2,3,0,1] -> "Barcelona","yo","en","vivo"
    // Click in correctOrder sequence: fragIdx 3 ("yo"), 1 ("vivo"), 0 ("en"), 2 ("Barcelona")
    const soItem = student.getByTestId('so-item-0')
    await expect(soItem).toBeVisible({ timeout: UI_TIMEOUT })

    await soItem.getByTestId('so-fragment-0-3').click() // "yo"
    await soItem.getByTestId('so-fragment-0-1').click() // "vivo"
    await soItem.getByTestId('so-fragment-0-0').click() // "en"
    await soItem.getByTestId('so-fragment-0-2').click() // "Barcelona"

    await student.getByTestId('check-answers-btn').click()

    // Item 0 should be correct
    await expect(student.getByTestId('so-result-0')).toHaveText('✓', { timeout: UI_TIMEOUT })

    // Total score: 2 SO items total; item 0 correct, item 1 unanswered (wrong)
    await expect(student.getByTestId('score-summary')).toContainText('/ 2 correct', { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('wrong sentence ordering answer shows correct answer', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceOrdering(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Click wrong order for item 0 (click "en" first instead of "yo")
    await student.getByTestId('so-fragment-0-0').click() // "en" first — wrong

    await student.getByTestId('check-answers-btn').click()

    await expect(student.getByTestId('so-result-0')).toContainText('✗', { timeout: UI_TIMEOUT })
    await expect(student.getByTestId('so-result-0')).toContainText('yo vivo en Barcelona', { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sentence ordering try again resets chip state', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const { context, page } = await createLessonWithSentenceOrdering(browser)

  try {
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    const student = page.getByTestId('exercises-student').first()
    await expect(student).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Click a fragment chip
    await student.getByTestId('so-fragment-0-3').click()
    await expect(student.getByTestId('so-chosen-0-0')).toBeVisible({ timeout: UI_TIMEOUT })

    await student.getByTestId('check-answers-btn').click()
    await student.getByTestId('try-again-btn').click()

    // After reset, no placed chips should remain
    await expect(student.getByTestId('so-chosen-0-0')).not.toBeVisible({ timeout: UI_TIMEOUT })
    await expect(student.getByTestId('check-answers-btn')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})
