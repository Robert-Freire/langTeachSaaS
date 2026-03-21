import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT } from '../helpers/timeouts'
import path from 'path'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('upload a material, see preview, then delete it', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a lesson
  await page.goto('/lessons/new')
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 15000 })
  await page.getByTestId('template-conversation').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })

  const lessonTitle = `Material Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Materials')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '60 min' }).click()
  await page.getByTestId('submit-lesson').click()

  // Wait for lesson editor
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Find the first section's upload button
  const uploadBtn = page.getByTestId('material-upload-btn').first()
  await expect(uploadBtn).toBeVisible({ timeout: UI_TIMEOUT })

  // Upload a test image via the hidden file input
  const fileInput = page.getByTestId('material-file-input').first()
  const testImagePath = path.resolve(__dirname, '../fixtures/test-image.png')
  await fileInput.setInputFiles(testImagePath)

  // Wait for the material preview to appear
  const thumbnail = page.getByTestId('material-thumbnail').first()
  await expect(thumbnail).toBeVisible({ timeout: 15000 })

  // Verify filename is shown
  const filename = page.getByTestId('material-filename').first()
  await expect(filename).toHaveText('test-image.png')

  // Delete the material (accept confirmation dialog)
  page.on('dialog', dialog => dialog.accept())
  const deleteBtn = page.getByTestId('material-delete-btn').first()
  await deleteBtn.click()

  // Material should disappear
  await expect(thumbnail).not.toBeVisible({ timeout: 10000 })

  await page.close()
  await context.close()
})
