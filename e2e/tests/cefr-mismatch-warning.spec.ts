import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const MOCK_COURSE = {
  id: '00000000-0000-0000-0000-000000000151',
  name: 'CEFR Mismatch Test Course',
  language: 'English',
  mode: 'general',
  targetCefrLevel: 'C1',
  targetExam: null,
  examDate: null,
  sessionCount: 5,
  studentId: null,
  studentName: null,
  lessonsCreated: 0,
  description: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  entries: [],
}

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('CEFR mismatch warning appears and can be dismissed in CourseNew', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Mock POST /api/courses so we don't trigger AI generation
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
    } else {
      await route.continue()
    }
  })
  await page.route(`**/api/courses/${MOCK_COURSE.id}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })

  // Create a student at A1 level
  const studentName = `CEFR Warn A1 ${Date.now()}`
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'A1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: NAV_TIMEOUT })

  // Navigate to course creation
  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  // Fill course name and language
  await page.getByTestId('course-name').fill('C1 English Course')
  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'English' }).click()

  // Select target CEFR level C1 (4 levels above A1)
  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'C1' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('C1', { timeout: UI_TIMEOUT })

  // Select the A1 student
  await page.getByTestId('student-select').click()
  await page.getByRole('option', { name: studentName }).click()

  // Warning banner should appear
  const warningBanner = page.getByTestId('cefr-mismatch-warning')
  await expect(warningBanner).toBeVisible({ timeout: UI_TIMEOUT })

  // Warning should mention both levels
  await expect(warningBanner).toContainText('A1')
  await expect(warningBanner).toContainText('C1')

  // Dismiss the warning
  await page.getByRole('button', { name: /dismiss/i }).click()
  await expect(warningBanner).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})
