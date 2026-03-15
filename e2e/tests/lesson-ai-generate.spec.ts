import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('generate AI content for lesson section, insert, and persist after refresh', async ({ browser }) => {
  test.setTimeout(90000) // streaming can take up to ~30s; allow 90s total
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  // Create a lesson via the wizard
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 15000 })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })

  // Pick any template (Grammar Focus)
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-grammar-focus').click()

  // Fill in lesson metadata
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })
  const lessonTitle = `AI Generate Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)

  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()

  await page.getByTestId('input-topic').fill('Travel vocabulary')

  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()

  await page.getByTestId('submit-lesson').click()

  // Should be on lesson editor
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Save section notes once so sections are persisted in DB (required for sectionId to exist)
  const presentationSection = page.getByTestId('section-presentation')
  await presentationSection.fill('Key travel vocabulary items.')
  await presentationSection.blur()
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: 5000 })

  // Click Generate on the Presentation section
  await page.getByTestId('generate-btn-presentation').click()
  await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: 5000 })

  // Vocabulary should be pre-selected for the Presentation section
  // Click Generate
  await page.getByTestId('generate-btn').click()

  // Wait for streaming to complete — "Insert into section" button appears
  await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: 45000 })

  // Generated output should have content
  const output = page.getByTestId('generate-output')
  await expect(output).not.toBeEmpty({ timeout: 5000 })

  // Insert into section
  await page.getByTestId('insert-btn').click()

  // Generate panel should close and content block appear
  await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: 5000 })

  // Reload and confirm the block is still there (persisted)
  await page.reload()
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })
  await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: 10000 })
})
