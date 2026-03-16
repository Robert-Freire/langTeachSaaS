import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createLessonViaApi(
  page: import('@playwright/test').Page,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data,
  })
  expect(response.ok(), `createLesson failed: ${response.status()}`).toBeTruthy()
  return response.json()
}

test('dashboard shows week strip with scheduled lesson', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a lesson scheduled for today
  const today = new Date()
  const scheduledAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T10:00:00`

  const lesson = await createLessonViaApi(page, {
    title: `Dashboard E2E ${Date.now()}`,
    language: 'English',
    cefrLevel: 'B1',
    topic: 'Dashboard test',
    durationMinutes: 60,
    scheduledAt,
  }) as { id: string }

  // Navigate to dashboard
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

  // Verify the lesson appears as a pill in the week strip
  const pill = page.getByTestId(`lesson-pill-${lesson.id}`)
  await expect(pill).toBeVisible({ timeout: UI_TIMEOUT })

  // Click the pill, verify navigation to lesson editor
  await pill.click()
  await expect(page).toHaveURL(new RegExp(`/lessons/${lesson.id}`), { timeout: UI_TIMEOUT })

  await context.close()
})

test('needs preparation shows draft lessons scheduled this week', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a draft lesson scheduled for tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const scheduledAt = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T14:00:00`

  const lesson = await createLessonViaApi(page, {
    title: `Needs Prep E2E ${Date.now()}`,
    language: 'Spanish',
    cefrLevel: 'A2',
    topic: 'Travel vocabulary',
    durationMinutes: 45,
    scheduledAt,
  }) as { id: string }

  // Navigate to dashboard
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

  // Verify the "Needs Preparation" section shows the draft lesson
  const prepSection = page.getByTestId('needs-preparation')
  await expect(prepSection).toBeVisible({ timeout: UI_TIMEOUT })

  const prepItem = page.getByTestId(`needs-prep-${lesson.id}`)
  await expect(prepItem).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('sidebar nav links navigate to correct routes', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

  const nav = page.locator('nav')

  // Nav -> Students
  await nav.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: UI_TIMEOUT })

  // Nav -> Lessons
  await nav.getByRole('link', { name: 'Lessons', exact: true }).click()
  await expect(page).toHaveURL('/lessons', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: UI_TIMEOUT })

  // Nav -> My Profile
  await nav.getByRole('link', { name: 'My Profile', exact: true }).click()
  await expect(page).toHaveURL('/settings', { timeout: UI_TIMEOUT })

  // Nav -> Dashboard
  await nav.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page).toHaveURL('/', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: UI_TIMEOUT })

  await context.close()
})
