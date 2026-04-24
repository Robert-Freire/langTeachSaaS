import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import path from 'path'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createStudent(page: import('@playwright/test').Page, name: string) {
  const res = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: {
      name,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
    },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

test('voice upload: extracted fields pre-fill form, autosave saves as Confirmed', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Voice Log Student ${Date.now()}`)

  // Navigate to student detail
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  // Log Session button navigates to the full LogSession page
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Upload audio file via the upload button in AudioRecorder
  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)

  // Wait for extraction to complete
  // StubTranscriptionService returns "[Test transcription]"
  // StubReflectionExtractionService returns "[Extracted] ..." values
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Verify extracted fields are pre-filled (title, topic tag, content, homework, next session)
  await expect(page.getByTestId('actual-content')).toHaveValue('[Extracted] What was covered')
  await expect(page.getByTestId('homework-assigned')).toHaveValue('[Extracted] Homework assigned')
  await expect(page.getByTestId('next-session-topics')).toHaveValue('[Extracted] Next lesson ideas')
  // title is saved silently; topic tag chip appears in TopicTagsInput
  await expect(page.getByTestId('topic-tag-remove-0')).toBeVisible({ timeout: 5000 })
  // Stub returns sessionDate='2026-01-15' and sessionStartTime='09:00'
  await expect(page.getByTestId('session-date')).toHaveValue('2026-01-15')
  await expect(page.getByTestId('session-time')).toHaveValue('09:00')

  // Done — autosave saves as Confirmed, navigates back to student detail
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: 10000 })

  // Navigate to session history tab and verify no "Pending review" badge
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-entry')).toBeVisible()
  expect(await page.getByTestId('draft-badge').count()).toBe(0)

  // Expand session entry and verify extracted title was saved
  await page.getByTestId('session-entry-toggle').click()
  await expect(page.getByTestId('session-title-input')).toHaveValue('[Extracted] Session title', { timeout: 5000 })

  await context.close()
})

test('Draft session shows "Pending review" badge in history', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Draft Badge Student ${Date.now()}`)

  // Create a Draft session via API
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: AUTH_HEADER,
    data: {
      actualContent: 'Draft content',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Draft',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Navigate to student detail → session history tab
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })

  // Draft badge should be visible
  await expect(page.getByTestId('draft-badge')).toBeVisible()
  await expect(page.getByTestId('draft-badge')).toHaveText('Pending review')

  await context.close()
})

test('voice recorder is accessible from the Lesson editor', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Lesson Editor Voice Student ${Date.now()}`)

  // Create a lesson linked to this student
  const lessonRes = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: AUTH_HEADER,
    data: {
      title: 'Voice Test Lesson',
      language: 'Spanish',
      cefrLevel: 'B1',
      topic: 'Grammar',
      durationMinutes: 60,
      studentId: student.id,
    },
  })
  expect(lessonRes.ok()).toBeTruthy()
  const lesson = await lessonRes.json()

  // Navigate to the lesson editor
  await page.goto(`/lessons/${lesson.id}`)
  await expect(page.getByTestId('log-session-btn')).toBeVisible({ timeout: 15000 })

  // Log Session button navigates to the full LogSession page (with lessonId pre-linked)
  await page.getByTestId('log-session-btn').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Voice recorder section should be present in create mode
  await expect(page.getByTestId('voice-recorder-section')).toBeVisible({ timeout: 5000 })

  await context.close()
})

test('editing a Draft session and saving confirms it', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Edit Draft Student ${Date.now()}`)

  // Create a Draft session via API
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: AUTH_HEADER,
    data: {
      actualContent: 'Initial draft content',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Draft',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Navigate to student detail → session history tab
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })

  // Draft badge is present
  await expect(page.getByTestId('draft-badge')).toBeVisible()

  // Expand and click Edit full session link — navigates to full-page edit route
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-full-session-link').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}/sessions/.+/edit`), { timeout: 10000 })
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Click Done — autosave has fired; navigates back to student sessions tab
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}(\\?tab=sessions)?$`), { timeout: 10000 })

  // Draft badge should be gone
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('draft-badge')).toBeHidden({ timeout: 5000 })

  await context.close()
})

test('voice recorder is accessible in edit mode', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Edit Mode Voice Student ${Date.now()}`)

  // Create a Draft session via API
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: AUTH_HEADER,
    data: {
      actualContent: 'Initial draft content',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Draft',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })

  // Open edit via full-page route
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-full-session-link').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Voice recorder section should be visible in edit mode (bug fix)
  await expect(page.getByTestId('voice-recorder-section')).toBeVisible({ timeout: 5000 })

  await context.close()
})

test('second voice note updates session, does not create a duplicate', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `No Duplicate Student ${Date.now()}`)

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  // Log Session button navigates to the full LogSession page
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')

  // First voice note: autosave creates a session
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Second voice note: should update the same session, not create a new one
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Navigate back; discard prompt may appear since session was created via autosave
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(new RegExp(`/students/${student.id}`), { timeout: 10000 })

  // Navigate to session history tab and verify only ONE session exists
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })
  const sessionEntries = page.getByTestId('session-entry')
  await expect(sessionEntries).toHaveCount(1, { timeout: 5000 })

  await context.close()
})

test('voice extraction append mode: concatenates extracted value with existing field content', async ({ browser }) => {
  // StubReflectionExtractionService returns nextLessonIdeas with mode "append".
  // This test verifies that when a Draft session has pre-existing nextSessionTopics,
  // the extracted value is appended rather than ignored or replaced.
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Append Mode Student ${Date.now()}`)

  // Create a Draft session with pre-existing nextSessionTopics
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: AUTH_HEADER,
    data: {
      nextSessionTopics: 'Existing topics',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Draft',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Navigate to student detail and open session history tab
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })

  // Open the Draft in edit mode via full-page route
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-full-session-link').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Verify the field is pre-populated before uploading audio
  await expect(page.getByTestId('next-session-topics')).toHaveValue('Existing topics', { timeout: 5000 })

  // Upload audio — stub returns nextLessonIdeas with mode "append"
  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)

  // Wait for extraction to complete
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Verify append: existing content + " " + extracted value
  await expect(page.getByTestId('next-session-topics')).toHaveValue(
    'Existing topics [Extracted] Next lesson ideas',
    { timeout: 5000 }
  )

  await context.close()
})

test('voice extraction replace mode: overwrites existing field content', async ({ browser }) => {
  // StubReflectionExtractionService returns whatWasCovered with mode "replace".
  // This test verifies that when a Draft session has pre-existing actualContent,
  // the extracted value replaces it rather than being ignored.
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Replace Mode Student ${Date.now()}`)

  // Create a Draft session with pre-existing actualContent
  const sessionRes = await page.request.post(`${API_BASE}/api/students/${student.id}/sessions`, {
    headers: AUTH_HEADER,
    data: {
      actualContent: 'Old content that should be replaced',
      previousHomeworkStatus: 'NotApplicable',
      status: 'Draft',
    },
  })
  expect(sessionRes.ok()).toBeTruthy()

  // Navigate to student detail and open session history tab
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })

  // Open the Draft in edit mode via full-page route
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-full-session-link').click()
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: 10000 })

  // Verify the field is pre-populated before uploading audio
  await expect(page.getByTestId('actual-content')).toHaveValue(
    'Old content that should be replaced',
    { timeout: 5000 }
  )

  // Upload audio — stub returns whatWasCovered with mode "replace"
  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)

  // Wait for extraction to complete
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Verify replace: old content is overwritten by extracted value
  await expect(page.getByTestId('actual-content')).toHaveValue(
    '[Extracted] What was covered',
    { timeout: 5000 }
  )

  await context.close()
})
