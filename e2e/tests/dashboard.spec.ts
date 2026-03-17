import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createStudentViaApi(
  page: import('@playwright/test').Page,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await page.request.post(`${API_BASE}/api/students`, {
    headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
    data,
  })
  expect(response.ok(), `createStudent failed: ${response.status()}`).toBeTruthy()
  return response.json()
}

async function deleteStudentViaApi(
  page: import('@playwright/test').Page,
  studentId: string,
): Promise<void> {
  const response = await page.request.delete(`${API_BASE}/api/students/${studentId}`, {
    headers: AUTH_HEADER,
  })
  if (!response.ok()) {
    console.warn(`Cleanup failed for student ${studentId}: ${response.status()}`)
  }
}

async function createLessonViaApi(
  page: import('@playwright/test').Page,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
    data,
  })
  expect(response.ok(), `createLesson failed: ${response.status()}`).toBeTruthy()
  return response.json()
}

async function deleteLessonViaApi(
  page: import('@playwright/test').Page,
  lessonId: string,
): Promise<void> {
  const response = await page.request.delete(`${API_BASE}/api/lessons/${lessonId}`, {
    headers: AUTH_HEADER,
  })
  if (!response.ok()) {
    console.warn(`Cleanup failed for lesson ${lessonId}: ${response.status()}`)
  }
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

  try {
    // Navigate to dashboard
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Verify the lesson appears as a pill in the week strip
    const pill = page.getByTestId(`lesson-pill-${lesson.id}`)
    await expect(pill).toBeVisible({ timeout: UI_TIMEOUT })

    // Click the pill, verify navigation to lesson editor
    await pill.click()
    await expect(page).toHaveURL(new RegExp(`/lessons/${lesson.id}`), { timeout: UI_TIMEOUT })
  } finally {
    await deleteLessonViaApi(page, lesson.id)
    await context.close()
  }
})

test('needs preparation shows draft lessons scheduled this week', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a draft lesson scheduled within this week (avoid boundary flakiness on Sat/Sun)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
  const targetDate = dayOfWeek >= 5 ? today : new Date(today.getTime() + 86400000)
  const scheduledAt = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T14:00:00`

  const lesson = await createLessonViaApi(page, {
    title: `Needs Prep E2E ${Date.now()}`,
    language: 'Spanish',
    cefrLevel: 'A2',
    topic: 'Travel vocabulary',
    durationMinutes: 45,
    scheduledAt,
  }) as { id: string }

  try {
    // Navigate to dashboard
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Verify the "Needs Preparation" section shows the draft lesson
    const prepSection = page.getByTestId('needs-preparation')
    await expect(prepSection).toBeVisible({ timeout: UI_TIMEOUT })

    const prepItem = page.getByTestId(`needs-prep-${lesson.id}`)
    await expect(prepItem).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await deleteLessonViaApi(page, lesson.id)
    await context.close()
  }
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

test('schedule from dashboard via create new', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudentViaApi(page, {
    name: `Schedule E2E ${Date.now()}`,
    learningLanguage: 'English',
    cefrLevel: 'B1',
    interests: ['travel'],
  }) as { id: string; name: string }

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Click the "+" on the first day column
    const triggers = page.getByTestId('schedule-popover-trigger')
    await expect(triggers.first()).toBeVisible({ timeout: UI_TIMEOUT })
    await triggers.first().click()

    // Select the student
    await page.getByTestId('schedule-student-select').click()
    await page.getByRole('option', { name: student.name }).click()

    // Set time
    await page.getByTestId('schedule-time-input').fill('14:30')

    // Click Create New Lesson
    await page.getByTestId('schedule-create-new').click()

    // Verify navigation to LessonNew with query params
    await expect(page).toHaveURL(/\/lessons\/new\?/, { timeout: UI_TIMEOUT })
    const url = new URL(page.url())
    expect(url.searchParams.get('studentId')).toBe(student.id)
    expect(url.searchParams.get('scheduledAt')).toContain('T14:30')

    // Verify the scheduled date input is pre-filled
    const dateInput = page.getByTestId('input-scheduled-at')
    // Go to step 2 first by clicking blank template
    await page.getByTestId('template-blank').click()
    await expect(dateInput).toHaveValue(/2026.*T14:30/, { timeout: UI_TIMEOUT })
  } finally {
    await deleteStudentViaApi(page, student.id)
    await context.close()
  }
})

test('assign draft from dashboard', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudentViaApi(page, {
    name: `Assign E2E ${Date.now()}`,
    learningLanguage: 'Spanish',
    cefrLevel: 'A2',
    interests: ['music'],
  }) as { id: string; name: string }

  // Create an unscheduled draft (no scheduledAt)
  const draft = await createLessonViaApi(page, {
    title: `Unscheduled Draft ${Date.now()}`,
    language: 'Spanish',
    cefrLevel: 'A2',
    topic: 'Music vocabulary',
    durationMinutes: 45,
  }) as { id: string }

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Verify draft shows in unscheduled section
    await expect(page.getByTestId(`unscheduled-${draft.id}`)).toBeVisible({ timeout: UI_TIMEOUT })

    // Click "+" on first day column
    const triggers = page.getByTestId('schedule-popover-trigger')
    await expect(triggers.first()).toBeVisible({ timeout: UI_TIMEOUT })
    await triggers.first().click()

    // Select student
    await page.getByTestId('schedule-student-select').click()
    await page.getByRole('option', { name: student.name }).click()

    // Click Assign Existing Draft
    await page.getByTestId('schedule-assign-draft').click()

    // Click the draft
    await page.getByTestId(`schedule-draft-${draft.id}`).click()

    // Wait for the popover to close (draft was assigned)
    await expect(page.getByTestId('schedule-popover-drafts')).not.toBeVisible({ timeout: UI_TIMEOUT })

    // Verify draft moved to week strip (should appear as a lesson pill now)
    await expect(page.getByTestId(`lesson-pill-${draft.id}`)).toBeVisible({ timeout: UI_TIMEOUT })

    // Verify it's no longer in unscheduled section
    await expect(page.getByTestId(`unscheduled-${draft.id}`)).not.toBeVisible()
  } finally {
    await deleteLessonViaApi(page, draft.id)
    await deleteStudentViaApi(page, student.id)
    await context.close()
  }
})
