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
  const todayIso = await page.evaluate(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const dateInput = page.getByTestId('session-date')
  await expect(dateInput).toHaveValue(todayIso)

  // Fill actual content (required)
  await page.getByTestId('actual-content').fill('Practiced preterito indefinido with reading exercises.')

  // Submit
  await page.getByTestId('submit-session-log').click()

  // Success confirmation
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })
  // Dialog should close automatically after success
  await expect(page.getByTestId('session-log-dialog')).toBeHidden({ timeout: 3000 })

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

test('expand session entry shows full detail without duplicating preview content', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Expand Test Student ${Date.now()}`
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
  const student = await createRes.json() as { id: string }

  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      plannedContent: 'Preterito indefinido intro',
      actualContent: 'Covered basics and exercises',
      previousHomeworkStatus: 'NotApplicable',
    },
  })

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByRole('tab', { name: /history/i }).click()

  const entry = page.getByTestId('session-entry').first()
  await expect(entry).toBeVisible({ timeout: 10000 })

  // Collapsed: preview content visible
  await expect(entry.getByText(/Preterito indefinido intro/)).toBeVisible()

  // Expand
  await entry.getByTestId('session-entry-toggle').click()
  await expect(entry.getByTestId('session-entry-detail')).toBeVisible()

  // Expanded: content appears exactly once (in detail section, not in collapsed preview)
  await expect(page.getByText('Preterito indefinido intro')).toHaveCount(1)
  await expect(page.getByText('Covered basics and exercises')).toHaveCount(1)

  // Collapse again
  await entry.getByTestId('session-entry-toggle').click()
  await expect(entry.getByTestId('session-entry-detail')).toBeHidden()

  await context.close()
})

test('delete session requires confirmation dialog', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Delete Confirm Test ${Date.now()}`
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
  const student = await createRes.json() as { id: string }

  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      actualContent: 'Test session to delete',
      previousHomeworkStatus: 'NotApplicable',
    },
  })

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByRole('tab', { name: /history/i }).click()

  const entry = page.getByTestId('session-entry').first()
  await expect(entry).toBeVisible({ timeout: 10000 })
  await entry.getByTestId('session-entry-toggle').click()

  // Click delete — confirmation dialog should appear
  await entry.getByTestId('delete-session-button').click()
  const confirmBtn = page.getByTestId('confirm-delete-session')
  await expect(confirmBtn).toBeVisible({ timeout: 5000 })

  // Cancel — session should remain
  await page.getByRole('button', { name: /cancel/i }).click()
  await expect(confirmBtn).toBeHidden()
  await expect(entry).toBeVisible()

  // Delete again and confirm
  await entry.getByTestId('delete-session-button').click()
  await expect(confirmBtn).toBeVisible({ timeout: 5000 })
  await confirmBtn.click()

  // Session entry should be removed from the list
  await expect(page.getByTestId('session-history-empty')).toBeVisible({ timeout: 10000 })

  await context.close()
})

test('summary header appears on history tab after logging a session', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Summary Header Test ${Date.now()}`
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
  const student = await createRes.json() as { id: string }

  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      actualContent: 'Preterito indefinido',
      previousHomeworkStatus: 'NotApplicable',
      nextSessionTopics: 'Work on para/por\nMore listening practice',
    },
  })

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })

  // Navigate to History tab
  await page.getByRole('tab', { name: /history/i }).click()

  await expect(page.getByTestId('session-summary-header')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-summary-action-items-toggle')).toBeVisible()

  // Expand action items
  await page.getByTestId('session-summary-action-items-toggle').click()
  await expect(page.getByTestId('session-summary-action-items-list')).toBeVisible()
  await expect(page.getByTestId('session-summary-action-items-list')).toContainText('Work on para/por')

  await context.close()
})
