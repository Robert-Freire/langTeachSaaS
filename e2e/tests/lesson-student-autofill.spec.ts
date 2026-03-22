import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('student selection auto-fills language and CEFR level in lesson form', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a student with known language and level
  const studentName = `AutoFill Student ${Date.now()}`
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'French' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'C1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Create a new lesson and select the student
  await page.goto('/lessons/new')
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })
  await expect(page.getByTestId('template-blank')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-blank').click()
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })

  // Student selector should appear before language (verify in DOM order)
  const studentTrigger = page.getByTestId('select-student')
  const languageTrigger = page.getByTestId('select-language')
  await expect(studentTrigger).toBeVisible({ timeout: 5000 })
  await expect(languageTrigger).toBeVisible()

  // Select the student
  await studentTrigger.click()
  await page.getByRole('option', { name: studentName }).click()

  // Language and CEFR level should be auto-filled
  await expect(languageTrigger).toContainText('French', { timeout: 5000 })
  await expect(page.getByTestId('select-level')).toContainText('C1', { timeout: 5000 })

  // Clear student — language and level should remain
  await studentTrigger.click()
  await page.getByRole('option', { name: 'No student' }).click()
  await expect(languageTrigger).toContainText('French')
  await expect(page.getByTestId('select-level')).toContainText('C1')

  await context.close()
})
