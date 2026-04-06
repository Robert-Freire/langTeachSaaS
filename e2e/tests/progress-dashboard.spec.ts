import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let diegoStudentId = ''
let diegoCourseId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ name?: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])

  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('Diego Seed not found. Run start-visual-stack.sh first.')
  diegoStudentId = diego.id

  // Find Diego's course
  const coursesRes = await page.request.get(`${API_BASE}/api/courses`, { headers: AUTH_HEADER })
  const courses: Array<{ id: string; studentId: string | null; name: string }> = await coursesRes.json()
  const diegoCourse = courses.find((c) => c.studentId === diegoStudentId)
  if (diegoCourse) diegoCourseId = diegoCourse.id

  await page.close()
  await ctx.close()
})

test('progress tab: coverage bar and pacing visible for Diego Seed', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto(`/students/${diegoStudentId}?tab=progress`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('tab-progress')).toBeVisible()

  // Coverage bar
  await expect(page.getByTestId('coverage-bar')).toBeVisible({ timeout: UI_TIMEOUT })

  // Pacing status chip
  await expect(page.getByTestId('pacing-status')).toBeVisible({ timeout: UI_TIMEOUT })

  // Difficulty trends
  await expect(page.getByTestId('difficulty-trends')).toBeVisible({ timeout: UI_TIMEOUT })

  // Timeline
  await expect(page.getByTestId('progress-timeline')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('progress tab: navigates directly from student detail tab click', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto(`/students/${diegoStudentId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-progress').click()

  await expect(page.getByTestId('coverage-bar')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('course detail: view student progress link present and navigates', async ({ browser }) => {
  if (!diegoCourseId) {
    test.skip(true, 'Diego course not found')
    return
  }

  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto(`/courses/${diegoCourseId}`)
  await expect(page.getByTestId('view-student-progress')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('view-student-progress').click()

  await expect(page.getByTestId('coverage-bar')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})
