import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('vocabulary renders as table and student preview shows study view', async ({ browser }) => {
  test.setTimeout(90000)
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  // Create a lesson
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 15000 })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })

  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-grammar-focus').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })
  const lessonTitle = `Typed Content Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)

  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()

  await page.getByTestId('input-topic').fill('Travel vocabulary')

  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()

  await page.getByTestId('submit-lesson').click()

  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Save section notes to persist the section in DB
  const presentationSection = page.getByTestId('section-presentation')
  await presentationSection.fill('Travel vocabulary items.')
  await presentationSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: 5000 })

  // Generate vocabulary
  await page.getByTestId('generate-btn-presentation').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('generate-btn').click()

  // Wait for streaming to complete
  await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: 45000 })
  await page.getByTestId('insert-btn').click()

  // Content block should appear
  await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: 5000 })

  // Vocabulary should render as a table (edit mode is default)
  await expect(page.getByTestId('vocabulary-table').first()).toBeVisible({ timeout: 5000 })

  // Navigate to student preview
  await page.getByTestId('preview-student-btn').click()
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: 10000 })

  // Study view should show the lesson title
  await expect(page.getByTestId('study-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Vocabulary should be visible in student view as a table
  await expect(page.getByTestId('vocabulary-table').first()).toBeVisible({ timeout: 5000 })
})
