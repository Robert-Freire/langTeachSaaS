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

  // Verify extracted fields are pre-filled
  await expect(page.getByTestId('actual-content')).toHaveValue('[Extracted] What was covered')
  await expect(page.getByTestId('homework-assigned')).toHaveValue('[Extracted] Homework assigned')
  await expect(page.getByTestId('next-session-topics')).toHaveValue('[Extracted] Next lesson ideas')

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
