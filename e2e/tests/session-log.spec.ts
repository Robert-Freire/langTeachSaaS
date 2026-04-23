import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Date defaults to today and duration defaults to 50 min
  const todayIso = new Date().toISOString().split('T')[0]
  await expect(page.getByTestId('session-date')).toHaveValue(todayIso)
  await expect(page.getByTestId('duration-select')).toBeVisible()

  // Fill in what happened
  await page.getByTestId('actual-content').fill('Practiced preterito indefinido with reading exercises.')

  // Autosave should trigger and complete
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

  // Click Done to navigate back
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

  // Session should appear in history
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry').first()).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('log session page: prev homework status shows when prev session has homework', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Previous homework status should appear since prior session had homework
  await expect(page.getByTestId('prev-homework-status')).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()

  const entry = page.getByTestId('session-entry').first()
  await expect(entry).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()

  const entry = page.getByTestId('session-entry').first()
  await expect(entry).toBeVisible({ timeout: UI_TIMEOUT })
  await entry.getByTestId('session-entry-toggle').click()

  // Click delete — confirmation dialog should appear
  await entry.getByTestId('delete-session-btn').click()
  const confirmBtn = page.getByTestId('confirm-delete-session')
  await expect(confirmBtn).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Cancel — session should remain
  await page.getByRole('button', { name: /cancel/i }).click()
  await expect(confirmBtn).toBeHidden()
  await expect(entry).toBeVisible()

  // Delete again and confirm
  await entry.getByTestId('delete-session-btn').click()
  await expect(confirmBtn).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await confirmBtn.click()

  // Session entry should be removed from the list
  await expect(page.getByTestId('session-history-empty')).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

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

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Set a future date (tomorrow)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tomorrowIso = tomorrow.toISOString().split('T')[0]
  await page.getByTestId('session-date').fill(tomorrowIso)
  await page.getByTestId('actual-content').fill('Planned grammar session')

  // Autosave should complete -- no validation error for future dates
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

  // Session appears in history
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry').first()).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('selecting a lesson in log session page links it to the session', async ({ browser }) => {
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
  const lesson = await createLessonRes.json() as { id: string }

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Linked lesson selector is inside the secondary section
  await page.getByTestId('toggle-secondary').click()
  await expect(page.getByTestId('linked-lesson')).toBeVisible({ timeout: UI_TIMEOUT })

  // Select the lesson
  await page.getByTestId('linked-lesson').click()
  await page.getByRole('option', { name: 'Subjunctive Intro' }).click()

  // Save — session should have the lesson linked
  await page.getByTestId('actual-content').fill('Covered subjunctive intro.')
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

  // Verify via API that lesson was linked
  const sessionsRes = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(sessionsRes.ok()).toBeTruthy()
  const sessions = await sessionsRes.json() as { linkedLessonId: string | null }[]
  expect(sessions.length).toBeGreaterThan(0)
  expect(sessions[0].linkedLessonId).toBe(lesson.id)

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry').first()).toBeVisible({ timeout: UI_TIMEOUT })
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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('cancelled-badge')).toBeVisible({ timeout: UI_TIMEOUT })

  // Open expanded view and click "Edit full session"
  const entry = page.getByTestId('session-entry').first()
  await entry.getByTestId('session-entry-toggle').click()
  await entry.getByTestId('edit-full-session-link').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}/sessions/${session.id}/edit`), { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Cancelled toggle should be checked
  await expect(page.getByTestId('cancelled-toggle')).toBeChecked()

  // Uncheck cancelled -- autosave fires immediately (saveNow)
  await page.getByTestId('cancelled-toggle').click()
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

  await page.getByTestId('done-btn').click()
  // Edit mode navigates to ?tab=sessions
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}(\\?tab=sessions)?$`), { timeout: UI_TIMEOUT })

  // Badge should be gone
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('cancelled-badge')).toBeHidden({ timeout: FEEDBACK_TIMEOUT })

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })

  // Navigate to History tab
  await page.getByRole('tab', { name: /history/i }).click()

  await expect(page.getByTestId('session-summary-header')).toBeVisible({ timeout: UI_TIMEOUT })
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
  expect(studentData.profile.difficulties[0].competency).toBe('Grammar')
  expect(studentData.profile.difficulties[0].subcategory).toBe('ser/estar')
  expect(studentData.profile.difficulties[0].severity).toBe('high')
  expect(studentData.profile.difficulties[0].status).toBe('Active')

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
  expect(studentData.profile.difficulties[0].description).toBe('Still confusing ser and estar')
  expect(studentData.profile.difficulties[0].severity).toBe('medium')
  expect(studentData.profile.difficulties[0].status).toBe('Active')

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

  // Open log session page for student A
  await page.goto(`/students/${studentA.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(`Student A ${ts}`, { timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Linked lesson selector is inside the secondary section
  await page.getByTestId('toggle-secondary').click()
  await expect(page.getByTestId('linked-lesson')).toBeVisible({ timeout: UI_TIMEOUT })

  // Open the lesson dropdown
  await page.getByTestId('linked-lesson').click()

  // Student A's lesson should be visible; Student B's lesson should not
  await expect(page.getByRole('option', { name: `Lesson for A ${ts}` })).toBeVisible()
  await expect(page.getByRole('option', { name: `Lesson for B ${ts}` })).not.toBeVisible()

  await context.close()
})

test('unsaved-changes guard: back button with data shows discard confirmation', async ({ browser }) => {
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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Enter some data to make the form dirty
  await page.getByTestId('actual-content').fill('We covered the present tense.')

  // Click the back button
  await page.getByTestId('back-button').click()

  // Discard confirmation bar should appear
  await expect(page.getByTestId('discard-confirm-bar')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Click Discard — form should navigate back
  await page.getByTestId('discard-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: FEEDBACK_TIMEOUT })

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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  await page.getByTestId('actual-content').fill('Some notes.')
  await page.getByTestId('back-button').click()
  await expect(page.getByTestId('discard-confirm-bar')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('keep-editing-btn').click()

  // Form stays open with data intact
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('actual-content')).toHaveValue('Some notes.')

  await context.close()
})

test('start next session button navigates to log session page with planned topics as reference', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Start Next Session Test ${Date.now()}`
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

  // Create a session with NextSessionTopics set
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      sessionDate: '2026-04-01',
      plannedContent: 'Preterito indefinido',
      actualContent: 'Covered basics',
      nextSessionTopics: 'Review irregular verbs',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Confirmed',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Navigate to student page, go to Sessions tab
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()

  // Expand the session entry
  await expect(page.getByTestId('session-entry')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('session-entry-toggle').click()
  await expect(page.getByTestId('session-entry-detail')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // "Start next session" button should be visible
  await expect(page.getByTestId('start-next-session-button')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Click it -- navigates to log-session page
  await page.getByTestId('start-next-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}/log-session`))

  // Planned topics from the previous session appear as a reference in the left panel
  await expect(page.getByTestId('log-session-left-panel')).toContainText('Review irregular verbs')

  // Log the next session
  await page.getByTestId('actual-content').fill('Covered irregular verbs')
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

  // Two sessions should now be present
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-entry')).toHaveCount(2, { timeout: UI_TIMEOUT })

  // Original session still shows its NextSessionTopics preview
  const previews = page.getByTestId('next-session-topics-preview')
  await expect(previews).toHaveCount(1)
  await expect(previews).toHaveText(/Review irregular verbs/)

  await context.close()
})

test('unsaved-changes guard: back button on empty form navigates without confirmation', async ({ browser }) => {
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
  await expect(page.getByTestId('student-detail-name')).toHaveText(studentName, { timeout: NAV_TIMEOUT })

  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })

  // Click back without entering data
  await page.getByTestId('back-button').click()

  // Navigates back immediately, no confirmation
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('discard-confirm-bar')).not.toBeVisible()

  await context.close()
})

// ── Log Session full-page autosave flow (t727) ──────────────────────────────

test('log session page: autosave creates session without submit button', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Autosave Test Student ${Date.now()}`
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

    // Navigate directly to log-session page
    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Type in "What Happened?" - triggers autosave
    await page.getByTestId('actual-content').fill('Practiced subjunctive with reading exercises.')

    // Wait for autosave to complete (status shows "All changes saved")
    await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: FEEDBACK_TIMEOUT })

    // Click Done to navigate back
    await page.getByTestId('done-btn').click()
    await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

    // Verify session was created in the API
    const sessionsRes = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(sessionsRes.ok()).toBeTruthy()
    const sessions = await sessionsRes.json()
    expect(sessions.length).toBeGreaterThan(0)
    expect(sessions[0].actualContent).toBe('Practiced subjunctive with reading exercises.')
  } finally {
    await context.close()
  }
})

test('log session page: Done navigates back without saving if no changes made', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `No Change Test ${Date.now()}`
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
    expect(createRes.ok()).toBeTruthy()
    const student = await createRes.json()

    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Click Done without typing anything
    await page.getByTestId('done-btn').click()
    await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

    // No session should have been created
    const sessionsRes = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(sessionsRes.ok()).toBeTruthy()
    const sessions = await sessionsRes.json()
    expect(sessions.length).toBe(0)
  } finally {
    await context.close()
  }
})

test('session title: typing a title saves it and appears in session list and edit mode', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Title Test Student ${Date.now()}`
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
    const student = await createRes.json() as { id: string }

    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Title input is visible with correct placeholder
    const titleInput = page.getByTestId('log-session-title-input')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveAttribute('placeholder', 'What did you work on? (optional)')
    await expect(titleInput).toHaveAttribute('maxlength', '120')

    // Type a title and session content
    await titleInput.fill('Present tense practice')
    await page.getByTestId('actual-content').fill('Covered present tense conjugations.')
    await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

    await page.getByTestId('done-btn').click()
    await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

    // Session list shows the typed title
    await page.getByRole('tab', { name: /history/i }).click()
    const entry = page.getByTestId('session-entry').first()
    await expect(entry).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(entry).toContainText('Present tense practice')

    // Open edit mode and verify title is pre-populated
    await entry.getByTestId('session-entry-toggle').click()
    await entry.getByTestId('edit-full-session-link').click()
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('log-session-title-input')).toHaveValue('Present tense practice')
  } finally {
    await context.close()
  }
})

test('session title: blank title shows date fallback in session list', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `No Title Student ${Date.now()}`
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
    const student = await createRes.json() as { id: string }

    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Leave title blank, fill content
    await page.getByTestId('actual-content').fill('Covered vocabulary.')
    await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

    await page.getByTestId('done-btn').click()
    await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

    // Session list shows date fallback (contains "Session,")
    await page.getByRole('tab', { name: /history/i }).click()
    const entry = page.getByTestId('session-entry').first()
    await expect(entry).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(entry).toContainText('Session,')
  } finally {
    await context.close()
  }
})
