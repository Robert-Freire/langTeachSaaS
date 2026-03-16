import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('export PDF downloads a file for teacher and student modes', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a lesson via the wizard
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 15000 })
  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })

  // Step 1: pick template
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-grammar-focus').click()

  // Step 2: fill metadata
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })
  const lessonTitle = `PDF Export Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Travel')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '45 min' }).click()
  await page.getByTestId('submit-lesson').click()

  // Wait for lesson editor
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Click the export button
  const exportBtn = page.getByTestId('export-pdf-btn')
  await expect(exportBtn).toBeVisible({ timeout: UI_TIMEOUT })
  await exportBtn.click()

  // Teacher Copy export
  const teacherOption = page.getByTestId('export-teacher')
  await expect(teacherOption).toBeVisible({ timeout: 5000 })

  const [teacherDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    teacherOption.click(),
  ])
  expect(teacherDownload.suggestedFilename()).toContain('.pdf')

  // Student Handout export
  await exportBtn.click()
  const studentOption = page.getByTestId('export-student')
  await expect(studentOption).toBeVisible({ timeout: 5000 })

  const [studentDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    studentOption.click(),
  ])
  expect(studentDownload.suggestedFilename()).toContain('.pdf')

  await context.close()
})
