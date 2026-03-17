import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('lesson notes: save from editor and view in student history', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create student via API
  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: {
      name: `Notes Student ${Date.now()}`,
      learningLanguage: 'English',
      cefrLevel: 'B1',
      interests: ['travel'],
    },
  })
  expect(studentRes.ok()).toBeTruthy()
  const student = await studentRes.json()

  // Create lesson with student linked via API
  const lessonTitle = `Notes Lesson ${Date.now()}`
  const lessonRes = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: AUTH_HEADER,
    data: {
      title: lessonTitle,
      language: 'English',
      cefrLevel: 'B1',
      topic: 'Grammar',
      durationMinutes: 45,
      studentId: student.id,
    },
  })
  expect(lessonRes.ok()).toBeTruthy()
  const lesson = await lessonRes.json()

  // Navigate to lesson editor
  await page.goto(`/lessons/${lesson.id}`)
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  // Scroll to and verify Lesson Notes card is visible
  const notesCard = page.getByTestId('lesson-notes-card')
  await expect(notesCard).toBeVisible({ timeout: UI_TIMEOUT })

  // Fill "What was covered" and blur to trigger save
  const coveredField = page.getByTestId('notes-whatWasCovered')
  await coveredField.scrollIntoViewIfNeeded()
  await coveredField.fill('Past tense irregular verbs')
  await coveredField.blur()

  // Verify saved indicator appears
  await expect(page.getByTestId('notes-saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Navigate to student edit page
  await page.goto(`/students/${student.id}/edit`)
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Verify Lesson History section shows the entry
  const historyCard = page.getByTestId('lesson-history-card')
  await expect(historyCard).toBeVisible({ timeout: UI_TIMEOUT })

  const historyTitle = page.getByTestId('lesson-history-title')
  await expect(historyTitle).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  // Verify the note content is displayed
  await expect(historyCard.getByText('Past tense irregular verbs')).toBeVisible()

  await page.close()
  await context.close()
})
