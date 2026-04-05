import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const COURSE_ID = '00000000-0000-0000-0000-000000000498'

const BASE_COURSE = {
  id: COURSE_ID,
  name: 'Guardrails Test Course',
  description: null,
  language: 'Spanish',
  mode: 'general',
  targetCefrLevel: 'A2',
  targetExam: null,
  examDate: null,
  sessionCount: 3,
  studentId: null,
  studentName: null,
  lessonsCreated: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  entries: [],
  dismissedWarningKeys: null,
}

const WARNING = {
  sessionIndex: 0,
  grammarFocus: 'Present simple',
  flagReason: 'Structure is below the target level for A2.',
  suggestedLevel: null,
}

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('course without warnings shows no warning panel', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.route(`**/api/courses/${COURSE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...BASE_COURSE, warnings: [] }),
    })
  })

  await page.goto(`/courses/${COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toBeVisible({ timeout: NAV_TIMEOUT })

  await expect(page.getByTestId('warnings-panel')).not.toBeVisible()
  await expect(page.getByTestId('warnings-panel-clear')).not.toBeVisible()

  await context.close()
})

test('course with warning shows panel and dismiss clears it', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  let warningDismissed = false

  await page.route(`**/api/courses/${COURSE_ID}/warnings/dismiss`, async (route) => {
    warningDismissed = true
    await route.fulfill({ status: 204 })
  })

  await page.route(`**/api/courses/${COURSE_ID}`, async (route) => {
    const body = warningDismissed
      ? {
          ...BASE_COURSE,
          warnings: [WARNING],
          dismissedWarningKeys: [`session:${WARNING.sessionIndex}:${WARNING.grammarFocus}`],
        }
      : { ...BASE_COURSE, warnings: [WARNING], dismissedWarningKeys: null }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.goto(`/courses/${COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toBeVisible({ timeout: NAV_TIMEOUT })

  const warningsPanel = page.getByTestId('warnings-panel')
  await expect(warningsPanel).toBeVisible({ timeout: UI_TIMEOUT })

  await page.getByTestId(`dismiss-warning-${WARNING.sessionIndex}`).click()

  await expect(warningsPanel).not.toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('warnings-panel-clear')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})
