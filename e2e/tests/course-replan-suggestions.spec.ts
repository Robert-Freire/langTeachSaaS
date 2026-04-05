import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const MOCK_COURSE_ID = '00000000-0000-0000-0000-000000000189'
const PLANNED_ENTRY_ID = '00000000-0000-0000-0000-000000000001'
const SUGGESTION_1_ID = '00000000-0000-0000-0000-000000000101'
const SUGGESTION_2_ID = '00000000-0000-0000-0000-000000000102'

const MOCK_COURSE = {
  id: MOCK_COURSE_ID,
  name: 'Spanish B1 Course',
  description: null,
  language: 'Spanish',
  mode: 'general',
  targetCefrLevel: 'B1',
  targetExam: null,
  examDate: null,
  sessionCount: 5,
  studentId: 'student-1',
  studentName: 'Ana',
  lessonsCreated: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  warnings: null,
  dismissedWarningKeys: null,
  entries: [
    {
      id: 'taught-entry-1',
      orderIndex: 0,
      topic: 'Present Tense',
      grammarFocus: 'Present simple',
      competencies: 'speaking',
      lessonType: 'Communicative',
      lessonId: 'lesson-1',
      status: 'taught',
      contextDescription: null,
      personalizationNotes: null,
      vocabularyThemes: null,
    },
    {
      id: PLANNED_ENTRY_ID,
      orderIndex: 1,
      topic: 'Tourism Vocabulary',
      grammarFocus: 'Subjunctive mood',
      competencies: 'speaking,reading',
      lessonType: 'Communicative',
      lessonId: null,
      status: 'planned',
      contextDescription: null,
      personalizationNotes: null,
      vocabularyThemes: null,
    },
  ],
}

const PENDING_SUGGESTIONS = [
  {
    id: SUGGESTION_1_ID,
    courseId: MOCK_COURSE_ID,
    curriculumEntryId: PLANNED_ENTRY_ID,
    curriculumEntryTopic: 'Tourism Vocabulary',
    curriculumEntryOrderIndex: 1,
    proposedChange: 'Add a 10-minute subjunctive review activity at the start of this session.',
    reasoning: 'Student struggled with subjunctive in the previous lesson (AreasToImprove: subjunctive mood).',
    status: 'pending',
    teacherEdit: null,
    generatedAt: new Date().toISOString(),
    respondedAt: null,
  },
  {
    id: SUGGESTION_2_ID,
    courseId: MOCK_COURSE_ID,
    curriculumEntryId: null,
    curriculumEntryTopic: null,
    curriculumEntryOrderIndex: null,
    proposedChange: 'Increase speaking practice time in upcoming lessons by 15 minutes.',
    reasoning: 'Student has a speaking difficulty noted in their profile.',
    status: 'pending',
    teacherEdit: null,
    generatedAt: new Date().toISOString(),
    respondedAt: null,
  },
]

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('suggestions tab: generate, accept, dismiss, and view history', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Track suggestion state for mutable responses
  let suggestions = [...PENDING_SUGGESTIONS]

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions/generate`, async (route) => {
    suggestions = [...PENDING_SUGGESTIONS]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suggestions) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suggestions) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions/${SUGGESTION_1_ID}/respond`, async (route) => {
    const body = await route.request().postDataJSON()
    const s = suggestions.find(s => s.id === SUGGESTION_1_ID)!
    const updated = {
      ...s,
      status: body.action === 'accept' ? 'accepted' : 'dismissed',
      teacherEdit: body.teacherEdit ?? null,
      respondedAt: new Date().toISOString(),
    }
    suggestions = suggestions.map(s => s.id === SUGGESTION_1_ID ? updated : s)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions/${SUGGESTION_2_ID}/respond`, async (route) => {
    const body = await route.request().postDataJSON()
    const s = suggestions.find(s => s.id === SUGGESTION_2_ID)!
    const updated = {
      ...s,
      status: body.action === 'accept' ? 'accepted' : 'dismissed',
      teacherEdit: body.teacherEdit ?? null,
      respondedAt: new Date().toISOString(),
    }
    suggestions = suggestions.map(s => s.id === SUGGESTION_2_ID ? updated : s)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) })
  })

  // Navigate to course detail
  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('Spanish B1 Course', { timeout: NAV_TIMEOUT })

  // Switch to Suggestions tab
  await page.getByTestId('tab-suggestions').click()
  await expect(page.getByTestId('course-suggestions-panel')).toBeVisible({ timeout: UI_TIMEOUT })

  // Initially empty (no suggestions yet)
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: UI_TIMEOUT })

  // Click Generate
  await page.getByTestId('generate-btn').click()

  // Suggestion cards appear
  await expect(page.getByTestId(`suggestion-card-${SUGGESTION_1_ID}`)).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId(`suggestion-card-${SUGGESTION_2_ID}`)).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByText('Add a 10-minute subjunctive review activity at the start of this session.')).toBeVisible()
  await expect(page.getByText('Increase speaking practice time in upcoming lessons by 15 minutes.')).toBeVisible()

  // Accept first suggestion
  const card1 = page.getByTestId(`suggestion-card-${SUGGESTION_1_ID}`)
  await card1.getByTestId('accept-btn').click()
  await expect(card1.getByTestId('accept-btn')).not.toBeVisible({ timeout: UI_TIMEOUT })

  // Dismiss second suggestion
  const card2 = page.getByTestId(`suggestion-card-${SUGGESTION_2_ID}`)
  await card2.getByTestId('dismiss-btn').click()
  await expect(card2.getByTestId('dismiss-btn')).not.toBeVisible({ timeout: UI_TIMEOUT })

  // Both moved to history
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('history-toggle')).toBeVisible()

  // Expand history
  await page.getByTestId('history-toggle').click()
  await expect(page.getByTestId(`suggestion-card-${SUGGESTION_1_ID}`)).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId(`suggestion-card-${SUGGESTION_2_ID}`)).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('suggestions tab: edit & accept applies teacher edit', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  let suggestions = [PENDING_SUGGESTIONS[0]]

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions/generate`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suggestions) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suggestions) })
  })

  await page.route(`**/api/courses/${MOCK_COURSE_ID}/suggestions/${SUGGESTION_1_ID}/respond`, async (route) => {
    const body = await route.request().postDataJSON()
    const updated = {
      ...suggestions[0],
      status: 'accepted',
      teacherEdit: body.teacherEdit ?? null,
      respondedAt: new Date().toISOString(),
    }
    suggestions = [updated]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('Spanish B1 Course', { timeout: NAV_TIMEOUT })

  await page.getByTestId('tab-suggestions').click()
  await page.getByTestId('generate-btn').click()

  await expect(page.getByTestId(`suggestion-card-${SUGGESTION_1_ID}`)).toBeVisible({ timeout: UI_TIMEOUT })

  // Click Edit & Accept
  await page.getByTestId('edit-btn').click()
  const textarea = page.getByTestId('edit-textarea')
  await expect(textarea).toBeVisible()

  await textarea.fill('Custom teacher edit: add 5-minute drills instead.')
  await page.getByTestId('confirm-edit-btn').click()

  // Card disappears from pending
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: UI_TIMEOUT })

  // History shows the edited text
  await page.getByTestId('history-toggle').click()
  await expect(page.getByText('Custom teacher edit: add 5-minute drills instead.')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})
