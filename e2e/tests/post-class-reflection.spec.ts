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

async function createStudentAndLesson(page: import('@playwright/test').Page) {
  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: {
      name: `Reflection Student ${Date.now()}`,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: ['music'],
    },
  })
  expect(studentRes.ok()).toBeTruthy()
  const student = await studentRes.json()

  const lessonTitle = `Reflection Lesson ${Date.now()}`
  const lessonRes = await page.request.post(`${API_BASE}/api/lessons`, {
    headers: AUTH_HEADER,
    data: {
      title: lessonTitle,
      language: 'Spanish',
      cefrLevel: 'B1',
      topic: 'Ser vs Estar',
      durationMinutes: 45,
      studentId: student.id,
    },
  })
  expect(lessonRes.ok()).toBeTruthy()
  const lesson = await lessonRes.json()

  return { student, lesson, lessonTitle }
}

test('post-class reflection: teacher types notes with all fields and history shows them', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const { student, lesson, lessonTitle } = await createStudentAndLesson(page)

  await page.goto(`/lessons/${lesson.id}`)
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  const notesCard = page.getByTestId('lesson-notes-card')
  await expect(notesCard).toBeVisible({ timeout: UI_TIMEOUT })

  const coveredField = page.getByTestId('notes-whatWasCovered')
  await coveredField.scrollIntoViewIfNeeded()
  await coveredField.fill('Ser vs Estar distinction')
  await coveredField.blur()

  await expect(page.getByTestId('notes-saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('notes-areasToImprove').fill('Confusion with temporary states')
  await page.getByTestId('notes-areasToImprove').blur()
  await expect(page.getByTestId('notes-saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('notes-emotionalSignals').fill('Student was frustrated but motivated')
  await page.getByTestId('notes-emotionalSignals').blur()
  await expect(page.getByTestId('notes-saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  await page.getByTestId('notes-homeworkAssigned').fill('Page 45 exercises')
  await page.getByTestId('notes-homeworkAssigned').blur()
  await expect(page.getByTestId('notes-saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Reload and verify persistence
  await page.reload()
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })
  await page.getByTestId('notes-whatWasCovered').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('notes-whatWasCovered')).toHaveValue('Ser vs Estar distinction', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('notes-emotionalSignals')).toHaveValue('Student was frustrated but motivated')

  // Verify history on student page
  await page.goto(`/students/${student.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: UI_TIMEOUT })

  const historyCard = page.getByTestId('lesson-history-card')
  await expect(historyCard).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(historyCard.getByTestId('lesson-history-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })
  await expect(historyCard.getByText('Ser vs Estar distinction')).toBeVisible()
  await expect(historyCard.getByTestId('lesson-history-emotional-signals')).toBeVisible()

  await page.close()
  await context.close()
})

test('post-class reflection: voice input section is visible on lesson with student', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const { lesson, lessonTitle } = await createStudentAndLesson(page)

  await page.goto(`/lessons/${lesson.id}`)
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

  const voiceSection = page.getByTestId('voice-input-section')
  await voiceSection.scrollIntoViewIfNeeded()
  await expect(voiceSection).toBeVisible({ timeout: UI_TIMEOUT })

  await page.close()
  await context.close()
})
