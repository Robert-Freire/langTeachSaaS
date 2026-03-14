import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('full lesson CRUD flow', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  // Navigate to lessons list
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 15000 })

  // Navigate to new lesson wizard
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })

  // Step 1: pick Grammar Focus template
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-grammar-focus').click()

  // Step 2: fill in lesson metadata
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })

  const lessonTitle = `Grammar Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)

  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()

  await page.getByTestId('input-topic').fill('Present Perfect')

  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()

  // Submit
  await page.getByTestId('submit-lesson').click()

  // Should redirect to lesson editor
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Edit the Presentation section
  const presentationSection = page.getByTestId('section-presentation')
  const presentationNotes = 'Explain the present perfect with clear examples: I have visited Paris.'
  await presentationSection.fill(presentationNotes)
  await presentationSection.blur()

  // Wait for saved indicator
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: 5000 })

  // Reload and verify notes persisted
  await page.reload()
  await expect(page.getByTestId('section-presentation')).toHaveValue(presentationNotes, { timeout: 10000 })

  // Capture current URL for comparison after duplicate
  const originalUrl = page.url()

  // Duplicate the lesson
  await page.getByTestId('duplicate-btn').click()

  // Should navigate to the duplicated lesson (different URL)
  await expect(page).not.toHaveURL(originalUrl, { timeout: 10000 })
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })

  // Duplicated lesson title should start with "Copy of"
  await expect(page.getByTestId('lesson-title')).toContainText('Copy of', { timeout: 10000 })

  // Navigate to lessons list — both original and copy should be visible
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })
  await expect(page.locator(`[data-testid="lesson-title"]:text-is("${lessonTitle}")`)).toBeVisible({ timeout: 10000 })
  await expect(page.locator(`[data-testid="lesson-title"]:text-is("Copy of ${lessonTitle}")`)).toBeVisible({ timeout: 10000 })

  await context.close()
})
