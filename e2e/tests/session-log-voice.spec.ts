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

test('voice upload: extracted fields pre-fill form, Confirm saves as Confirmed', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Voice Log Student ${Date.now()}`)

  // Navigate to student detail
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  // Open Log Session dialog
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Upload audio file via the upload button in AudioRecorder
  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)

  // Wait for extraction to complete: submit button changes to "Confirm"
  // StubTranscriptionService returns "[Test transcription]"
  // StubReflectionExtractionService returns "[Extracted] ..." values
  await expect(page.getByTestId('submit-session-log')).toHaveText('Confirm', { timeout: 20000 })

  // Verify extracted fields are pre-filled (title, topic tag, content, homework, next session)
  await expect(page.getByTestId('actual-content')).toHaveValue('[Extracted] What was covered')
  await expect(page.getByTestId('homework-assigned')).toHaveValue('[Extracted] Homework assigned')
  await expect(page.getByTestId('next-session-topics')).toHaveValue('[Extracted] Next lesson ideas')
  // title is saved silently; topic tag chip appears in TopicTagsInput
  await expect(page.getByTestId('topic-tag-remove-0')).toBeVisible({ timeout: 5000 })

  // Confirm — submits and transitions Draft → Confirmed
  await page.getByTestId('submit-session-log').click()

  // Success
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-log-dialog')).toBeHidden({ timeout: 3000 })

  // Navigate to session history tab and verify no "Pending review" badge
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-entry')).toBeVisible()
  expect(await page.getByTestId('draft-badge').count()).toBe(0)

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

  // Open Log Session dialog from lesson editor
  await page.getByTestId('log-session-btn').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Voice recorder section should be present (create mode)
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

  // Expand and click Edit
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-session-button').click()

  // Dialog opens in edit mode
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Save changes — transitions to Confirmed
  await page.getByTestId('submit-session-log').click()
  await expect(page.getByTestId('session-log-success')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('session-log-dialog')).toBeHidden({ timeout: 3000 })

  // Draft badge should be gone
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

  // Open edit dialog
  await page.getByTestId('session-entry-toggle').click()
  await page.getByTestId('edit-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  // Voice recorder section should be visible in edit mode (bug fix)
  await expect(page.getByTestId('voice-recorder-section')).toBeVisible({ timeout: 5000 })

  await context.close()
})

test('second voice note updates draft, does not create a duplicate', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `No Duplicate Draft Student ${Date.now()}`)

  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: 15000 })

  // Open Log Session dialog
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: 10000 })

  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')

  // First voice note: creates a Draft
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)
  await expect(page.getByTestId('submit-session-log')).toHaveText('Confirm', { timeout: 20000 })

  // Second voice note: should update the same Draft, not create a new one.
  // Wait for the extracting indicator to appear and clear so we know the second upload ran.
  await page.getByTestId('audio-file-input').setInputFiles(audioPath)
  await expect(page.getByTestId('extracting-indicator')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('extracting-indicator')).toBeHidden({ timeout: 20000 })

  // Close the dialog without confirming
  await page.keyboard.press('Escape')
  // Dismiss the discard dialog if it appears
  const discardBtn = page.getByTestId('discard-btn')
  if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await discardBtn.click()
  }

  // Navigate to session history tab and verify only ONE Draft exists
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: 10000 })
  const draftBadges = page.getByTestId('draft-badge')
  await expect(draftBadges).toHaveCount(1, { timeout: 5000 })

  await context.close()
})
