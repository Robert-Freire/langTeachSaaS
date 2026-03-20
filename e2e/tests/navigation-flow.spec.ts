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

test('navigation flow using in-page Back buttons and links', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // 1. Students list: verify heading and "Add Student" link
  await page.goto('/students')
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 15000 })

  // Click "Add Student" to go to form
  await page.getByRole('link', { name: /Add Student/i }).click()
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  // Verify Back button exists and points to /students
  const studentBackLink = page.getByTestId('page-header-back')
  await expect(studentBackLink).toBeVisible()
  await expect(studentBackLink).toHaveAttribute('href', '/students')

  // Fill and save a student
  const studentName = `Nav Test ${Date.now()}`
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'A2' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()

  // Should redirect back to students list
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  await expect(page.getByTestId('student-name').filter({ hasText: studentName })).toBeVisible({ timeout: 10000 })

  // 2. Click the student to edit, verify Back, then go back
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('page-header-back')).toHaveAttribute('href', '/students')

  // Click Back to return to list
  await page.getByTestId('page-header-back').click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // 3. Lessons: verify heading and create a lesson
  await page.goto('/lessons')
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 15000 })

  await page.getByTestId('new-lesson-btn').click()
  await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: 10000 })

  // Verify Back link on step 1
  await expect(page.getByTestId('page-header-back')).toHaveAttribute('href', '/lessons')

  // Pick blank template to go to step 2
  await expect(page.getByTestId('template-blank')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('template-blank').click()
  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })

  // Fill and create lesson
  const lessonTitle = `Nav Lesson ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Navigation testing')
  await page.getByTestId('submit-lesson').click()

  // Should redirect to lesson editor
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 15000 })

  // 4. Lesson Editor: verify Back link and save indicator
  await expect(page.getByTestId('page-header-back')).toHaveAttribute('href', '/lessons')

  // Edit a section to trigger save
  const warmupTextarea = page.getByTestId('section-warmup')
  await warmupTextarea.fill('Warm up activity for nav test')
  await warmupTextarea.blur()

  // Wait for "All changes saved" indicator
  await expect(page.getByTestId('saved-indicator')).toHaveText('All changes saved', { timeout: 10000 })

  // 5. Preview as Student: verify Back to editor
  await page.getByTestId('preview-student-btn').click()
  await expect(page.getByTestId('page-header-back')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('page-header-back')).toHaveTextContent('Back to editor')
  await expect(page.getByText('Preview')).toBeVisible()

  // Click Back to return to editor
  await page.getByTestId('page-header-back').click()
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  await context.close()
})
