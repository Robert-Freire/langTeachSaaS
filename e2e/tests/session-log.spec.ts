import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('log session from student detail page', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a student via API
  const studentName = `Session Test Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const student = await createRes.json()

  // Navigate to student detail page
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })

  // Click Log session
  await page.getByTestId('log-session-button').click()

  // Dialog should open
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Date is already filled (today)
  const dateInput = page.getByTestId('session-date')
  await expect(dateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)

  // Fill actual content (required)
  await page.getByTestId('actual-content').fill('Practiced preterito indefinido with reading exercises.')

  // Submit
  await page.getByTestId('submit-session-log').click()

  // Success confirmation
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })

  await context.close()
})

test('log session dialog prev homework status shows when prev session has homework', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create student
  const studentName = `Homework Cond Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'A2',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
    },
  })
  const student = await createRes.json()

  // Create a prior session with homework
  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      actualContent: 'Grammar review',
      homeworkAssigned: 'Read pages 5-10',
      previousHomeworkStatus: 'NotApplicable',
    },
  })

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Previous homework status should appear since prior session had homework
  await expect(page.getByTestId('prev-homework-status')).toBeVisible({ timeout: 8000 })

  await context.close()
})
