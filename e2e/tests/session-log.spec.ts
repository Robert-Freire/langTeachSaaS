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

test('topic tag category dropdown has all four curriculum-aligned options', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Tag Category Test ${Date.now()}`
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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Open the category dropdown and verify all four options exist
  await page.getByTestId('topic-tag-category').click()
  await expect(page.getByRole('option', { name: 'Grammar' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Vocabulary' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Competency' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Communicative function' })).toBeVisible()

  // Select Grammar and add a tag
  await page.getByRole('option', { name: 'Grammar' }).click()
  await page.getByTestId('topic-tag-name').fill('preterito indefinido')
  await page.getByTestId('topic-tag-add').click()

  // Badge should display tag with category label
  await expect(page.getByTestId('topic-tags-input')).toContainText('preterito indefinido')
  await expect(page.getByTestId('topic-tags-input')).toContainText('(Grammar)')

  await context.close()
})

test('future session date is accepted and appears in history', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Future Date Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName, learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], learningGoals: [], weaknesses: [], difficulties: [],
    },
  })
  const student = await createRes.json() as { id: string }

  // Log a session with a future date via UI
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Set a future date (tomorrow)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tomorrowIso = tomorrow.toISOString().split('T')[0]
  await page.getByTestId('session-date').fill(tomorrowIso)
  await page.getByTestId('planned-content').fill('Planned grammar session')
  await page.getByTestId('submit-session-log').click()

  // Success -- no validation error
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-log-dialog')).toBeHidden({ timeout: 3000 })

  // Session appears in history
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry').first()).toBeVisible({ timeout: 10000 })

  await context.close()
})

test('selecting a lesson in log session dialog auto-populates planned content', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Lesson Link Test ${Date.now()}`
  const createStudentRes = await page.request.post(`${API_BASE}/api/students`, {
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
  expect(createStudentRes.ok()).toBeTruthy()
  const student = await createStudentRes.json() as { id: string }

  // Create a lesson linked to this student
  const createLessonRes = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      title: 'Subjunctive Intro',
      language: 'Spanish',
      cefrLevel: 'B1',
      topic: 'Subjunctive',
      durationMinutes: 60,
      objectives: 'Use subjunctive in wishes and doubt',
      studentId: student.id,
    },
  })
  expect(createLessonRes.ok()).toBeTruthy()

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // The linked lesson selector should be visible (student has a lesson)
  await expect(page.getByTestId('linked-lesson')).toBeVisible({ timeout: 8000 })

  // Select the lesson
  await page.getByTestId('linked-lesson').click()
  await page.getByRole('option', { name: 'Subjunctive Intro' }).click()

  // Planned content should be auto-populated
  await expect(page.getByTestId('planned-content')).toHaveValue(
    'Subjunctive Intro: Use subjunctive in wishes and doubt'
  )

  await context.close()
})

test('cancelled session shows Cancelled badge and is excluded from summary count', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Cancelled Session Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName, learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], learningGoals: [], weaknesses: [], difficulties: [],
    },
  })
  const student = await createRes.json() as { id: string }

  // Create a normal session and a cancelled session via API
  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      actualContent: 'Normal session',
      previousHomeworkStatus: 'NotApplicable',
      isCancelled: false,
    },
  })
  await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plannedContent: 'Planned but cancelled',
      previousHomeworkStatus: 'NotApplicable',
      isCancelled: true,
    },
  })

  // Cancelled badge visible in history
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry').first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('cancelled-badge')).toBeVisible()

  // Summary count = 1 (only the non-cancelled session)
  const summaryRes = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions/summary`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(summaryRes.ok()).toBeTruthy()
  const summary = await summaryRes.json() as { totalSessions: number }
  expect(summary.totalSessions).toBe(1)

  await context.close()
})

test('un-cancel a session removes the Cancelled badge', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Uncancel Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName, learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], learningGoals: [], weaknesses: [], difficulties: [],
    },
  })
  const student = await createRes.json() as { id: string }

  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: new Date().toISOString().split('T')[0],
      plannedContent: 'Was cancelled',
      previousHomeworkStatus: 'NotApplicable',
      isCancelled: true,
    },
  })
  const session = await sessionRes.json() as { id: string }

  // View history -- badge present
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('cancelled-badge')).toBeVisible({ timeout: 10000 })

  // Edit session -- uncheck cancelled
  const entry = page.getByTestId('session-entry').first()
  await entry.getByTestId('session-entry-toggle').click()
  await entry.getByTestId('edit-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('cancelled-toggle')).toBeChecked()
  await page.getByTestId('cancelled-toggle').click()
  await page.getByTestId('submit-session-log').click()
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-log-dialog')).toBeHidden({ timeout: 3000 })

  // Badge should be gone
  await expect(page.getByTestId('cancelled-badge')).toBeHidden()

  // Verify via API -- session is no longer cancelled
  const updated = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions/${session.id}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const updatedData = await updated.json() as { isCancelled: boolean }
  expect(updatedData.isCancelled).toBe(false)

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

  // Session card should show nextSessionTopics collapsed preview and expanded section
  await expect(page.getByTestId('next-session-topics-preview')).toBeVisible()
  await expect(page.getByTestId('next-session-topics-preview')).toContainText('Work on para/por')

  await page.getByTestId('session-entry-toggle').click()
  await expect(page.getByTestId('next-session-topics-section')).toBeVisible()
  await expect(page.getByTestId('next-session-topics-section')).toContainText('Planned for next class')
  await expect(page.getByTestId('next-session-topics-section')).toContainText('Work on para/por')

  await context.close()
})


test('confirming session with suggestedDifficulties upserts them to student profile', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: `Difficulty Upsert Test ${Date.now()}`,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
    },
  })
  const student = await createRes.json() as { id: string }

  // Create a confirmed session with suggested difficulties
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      actualContent: 'Ser vs estar practice',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Confirmed',
      suggestedDifficulties: [
        { description: 'Confuses ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
      ],
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Verify student now has the difficulty
  const studentRes = await page.request.get(`${API_BASE}/api/students/${student.id}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const studentData = await studentRes.json() as { difficulties: { competency: string; subcategory: string; severity: string; status: string }[] }
  expect(studentData.difficulties).toHaveLength(1)
  expect(studentData.difficulties[0].competency).toBe('Grammar')
  expect(studentData.difficulties[0].subcategory).toBe('ser/estar')
  expect(studentData.difficulties[0].severity).toBe('high')
  expect(studentData.difficulties[0].status).toBe('Active')

  await context.close()
})

test('confirming session updates existing difficulty in profile', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: `Difficulty Update Test ${Date.now()}`,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'manual-1', description: 'Old description', competency: 'Grammar', subcategory: 'ser/estar', severity: 'low', trend: 'stable', status: 'Covered' },
      ],
    },
  })
  const student = await createRes.json() as { id: string }

  // Confirm session with updated difficulty (same competency+subcategory)
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      actualContent: 'Revisited ser/estar',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Confirmed',
      suggestedDifficulties: [
        { description: 'Still confusing ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'medium' },
      ],
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Student should still have 1 difficulty, but updated
  const studentRes = await page.request.get(`${API_BASE}/api/students/${student.id}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const studentData = await studentRes.json() as { difficulties: { description: string; severity: string; status: string }[] }
  expect(studentData.difficulties).toHaveLength(1)
  expect(studentData.difficulties[0].description).toBe('Still confusing ser and estar')
  expect(studentData.difficulties[0].severity).toBe('medium')
  expect(studentData.difficulties[0].status).toBe('Active')

  await context.close()
})

test('lesson dropdown in session log shows only lessons for the selected student', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const ts = Date.now()

  // Create two students
  const createStudentA = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { name: `Student A ${ts}`, learningLanguage: 'Spanish', cefrLevel: 'B1', interests: [], learningGoals: [], weaknesses: [], difficulties: [] },
  })
  const studentA = await createStudentA.json() as { id: string }

  const createStudentB = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { name: `Student B ${ts}`, learningLanguage: 'French', cefrLevel: 'A2', interests: [], learningGoals: [], weaknesses: [], difficulties: [] },
  })
  const studentB = await createStudentB.json() as { id: string }

  // Create one lesson per student
  await page.request.post(`${API_BASE}/api/lessons`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { title: `Lesson for A ${ts}`, language: 'Spanish', cefrLevel: 'B1', topic: 'Subjunctive', durationMinutes: 60, studentId: studentA.id },
  })
  await page.request.post(`${API_BASE}/api/lessons`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { title: `Lesson for B ${ts}`, language: 'French', cefrLevel: 'A2', topic: 'Articles', durationMinutes: 60, studentId: studentB.id },
  })

  // Open session log dialog for student A
  await page.goto(`/students/${studentA.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(`Student A ${ts}`, { timeout: 15000 })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('linked-lesson')).toBeVisible({ timeout: 8000 })

  // Open the lesson dropdown
  await page.getByTestId('linked-lesson').click()

  // Student A's lesson should be visible; Student B's lesson should not
  await expect(page.getByRole('option', { name: `Lesson for A ${ts}` })).toBeVisible()
  await expect(page.getByRole('option', { name: `Lesson for B ${ts}` })).not.toBeVisible()

  await context.close()
})

test('unsaved-changes guard: clicking outside with data shows discard confirmation', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Guard Test Student ${Date.now()}`
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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Enter some data to make the form dirty
  await page.getByTestId('actual-content').fill('We covered the present tense.')

  // Click outside the dialog (top-left corner of viewport)
  await page.mouse.click(10, 10)

  // Discard confirmation should appear
  await expect(page.getByTestId('discard-confirm-dialog')).toBeVisible({ timeout: 5000 })

  // Click Discard — form should close
  await page.getByTestId('discard-btn').click()
  await expect(page.getByTestId('session-log-dialog')).not.toBeVisible({ timeout: 5000 })

  await context.close()
})

test('unsaved-changes guard: Keep editing returns to the form', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Guard Keep Test ${Date.now()}`
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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  await page.getByTestId('actual-content').fill('Some notes.')
  await page.mouse.click(10, 10)
  await expect(page.getByTestId('discard-confirm-dialog')).toBeVisible({ timeout: 5000 })

  await page.getByTestId('keep-editing-btn').click()

  // Form stays open with data intact
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('actual-content')).toHaveValue('Some notes.')

  await context.close()
})

test('unsaved-changes guard: empty form closes without confirmation', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Guard Empty Test ${Date.now()}`
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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: 15000 })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Click outside without entering data
  await page.mouse.click(10, 10)

  // Dialog closes immediately, no confirmation
  await expect(page.getByTestId('session-log-dialog')).not.toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('discard-confirm-dialog')).not.toBeVisible()

  await context.close()
})
