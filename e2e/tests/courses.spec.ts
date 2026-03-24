import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const MOCK_COURSE_ID = '00000000-0000-0000-0000-000000000099'

/** Curriculum fixture returned by the mocked POST /api/courses */
const MOCK_COURSE = {
  id: MOCK_COURSE_ID,
  name: 'B2 English Course',
  description: null,
  language: 'English',
  mode: 'general',
  targetCefrLevel: 'B2',
  targetExam: null,
  examDate: null,
  sessionCount: 5,
  studentId: null,
  studentName: null,
  lessonsCreated: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  entries: [
    { id: 'e1', orderIndex: 1, topic: 'Greetings and Introductions', grammarFocus: 'Present simple', competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned' },
    { id: 'e2', orderIndex: 2, topic: 'Daily Routines', grammarFocus: 'Present simple habits', competencies: 'reading,writing', lessonType: 'Mixed', lessonId: null, status: 'planned' },
    { id: 'e3', orderIndex: 3, topic: 'Past Events', grammarFocus: 'Past simple', competencies: 'speaking,listening', lessonType: 'Grammar-focused', lessonId: null, status: 'planned' },
    { id: 'e4', orderIndex: 4, topic: 'Future Plans', grammarFocus: 'Going to / will', competencies: 'writing', lessonType: 'Communicative', lessonId: null, status: 'planned' },
    { id: 'e5', orderIndex: 5, topic: 'Review and Practice', grammarFocus: null, competencies: 'reading,writing,speaking,listening', lessonType: 'Mixed', lessonId: null, status: 'planned' },
  ],
}

/** Reordered course (entry 0 and 1 swapped) */
const REORDERED_COURSE = {
  ...MOCK_COURSE,
  entries: [
    { ...MOCK_COURSE.entries[1], orderIndex: 1 },
    { ...MOCK_COURSE.entries[0], orderIndex: 2 },
    ...MOCK_COURSE.entries.slice(2),
  ],
}

/** Updated entry 0 after edit */
const UPDATED_ENTRY = {
  ...MOCK_COURSE.entries[0],
  topic: 'Updated Topic',
  grammarFocus: 'Present perfect',
}

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('create course (general mode) and view curriculum', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Mock POST /api/courses to return fixture (avoids Claude API call)
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
    } else {
      await route.continue()
    }
  })

  // Mock GET /api/courses/:id
  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  // Verify mode selection is visible
  await expect(page.getByTestId('mode-general')).toBeVisible()
  await expect(page.getByTestId('mode-exam-prep')).toBeVisible()

  // Fill in form
  await page.getByTestId('course-name').fill('B2 English Course')

  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'English' }).click()
  await expect(page.getByTestId('language-select')).toContainText('English', { timeout: UI_TIMEOUT })

  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'B2' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('B2', { timeout: UI_TIMEOUT })

  // Generate (use default session count)
  await page.getByTestId('generate-curriculum-btn').click()

  // Should navigate to course detail
  await expect(page).toHaveURL(new RegExp(`/courses/${MOCK_COURSE_ID}`), { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Verify curriculum entries are shown
  await expect(page.getByTestId('curriculum-list')).toBeVisible()
  await expect(page.getByText('Greetings and Introductions')).toBeVisible()
  await expect(page.getByText('Daily Routines')).toBeVisible()

  // Verify progress indicator
  await expect(page.getByTestId('course-progress')).toHaveText('0 of 5 lessons created')

  await context.close()
})

test('create course (exam-prep mode)', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const examCourse = {
    ...MOCK_COURSE,
    id: '00000000-0000-0000-0000-000000000098',
    name: 'DELE B2 Prep',
    mode: 'exam-prep',
    targetCefrLevel: null,
    targetExam: 'DELE',
  }

  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(examCourse) })
    } else {
      await route.continue()
    }
  })
  await page.route(`**/api/courses/${examCourse.id}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(examCourse) })
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  // Switch to exam prep mode
  await page.getByTestId('mode-exam-prep').click()
  await expect(page.getByTestId('exam-select')).toBeVisible()

  await page.getByTestId('course-name').fill('DELE B2 Prep')

  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await expect(page.getByTestId('language-select')).toContainText('Spanish', { timeout: UI_TIMEOUT })

  await page.getByTestId('exam-select').click()
  await page.getByRole('option', { name: 'DELE' }).click()
  await expect(page.getByTestId('exam-select')).toContainText('DELE', { timeout: UI_TIMEOUT })

  await page.getByTestId('generate-curriculum-btn').click()

  await expect(page).toHaveURL(new RegExp(`/courses/${examCourse.id}`), { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('course-title')).toHaveText('DELE B2 Prep', { timeout: NAV_TIMEOUT })

  await context.close()
})

test('reorder curriculum entries', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  let getCallCount = 0
  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    getCallCount++
    const body = getCallCount === 1 ? MOCK_COURSE : REORDERED_COURSE
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.route(`**/api/courses/${MOCK_COURSE_ID}/curriculum/reorder`, async (route) => {
    await route.fulfill({ status: 204 })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Click move-down on first entry
  await page.getByTestId('move-down-0').click()

  // After reorder, the second GET returns reordered data
  await expect(page.getByTestId('curriculum-entry-0')).toContainText('Daily Routines', { timeout: UI_TIMEOUT })

  await context.close()
})

test('edit curriculum entry', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  let getCallCount = 0
  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    getCallCount++
    const courseWithUpdate = getCallCount === 1 ? MOCK_COURSE : {
      ...MOCK_COURSE,
      entries: [UPDATED_ENTRY, ...MOCK_COURSE.entries.slice(1)],
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(courseWithUpdate) })
  })
  await page.route(`**/api/courses/${MOCK_COURSE_ID}/curriculum/e1`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(UPDATED_ENTRY) })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Click edit on first entry
  await page.getByTestId('edit-entry-0').click()
  await expect(page.getByTestId('edit-topic')).toBeVisible()

  // Update topic
  await page.getByTestId('edit-topic').fill('Updated Topic')
  await page.getByTestId('save-entry-btn').click()

  // After save, first entry shows updated topic
  await expect(page.getByTestId('curriculum-entry-0')).toContainText('Updated Topic', { timeout: UI_TIMEOUT })

  await context.close()
})

test('generate lesson from curriculum entry', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const newLessonId = '00000000-0000-0000-0000-000000001234'

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })
  await page.route(`**/api/courses/${MOCK_COURSE_ID}/curriculum/e1/lesson`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lessonId: newLessonId }),
    })
  })
  // Mock the lesson editor route so it doesn't 404
  await page.route(`**/api/lessons/${newLessonId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: newLessonId,
        title: 'Greetings and Introductions',
        language: 'English',
        cefrLevel: 'B2',
        topic: 'Greetings and Introductions',
        durationMinutes: 60,
        objectives: null,
        status: 'Draft',
        studentId: null,
        studentName: null,
        templateId: null,
        sections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scheduledAt: null,
      }),
    })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Click "Generate Lesson" on first entry
  await page.getByTestId('generate-lesson-0').click()

  // Should navigate to lesson editor
  await expect(page).toHaveURL(new RegExp(`/lessons/${newLessonId}`), { timeout: UI_TIMEOUT })

  await context.close()
})

test('create course from structured curriculum template', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const TEMPLATE_COURSE_ID = '00000000-0000-0000-0000-000000000088'
  const MOCK_TEMPLATES = [
    { level: 'B1.1', cefrLevel: 'B1', unitCount: 5, sampleGrammar: ['Present subjunctive', 'Past tenses'] },
    { level: 'B1.2', cefrLevel: 'B1', unitCount: 4, sampleGrammar: ['Conditional sentences'] },
  ]
  const TEMPLATE_COURSE = {
    ...MOCK_COURSE,
    id: TEMPLATE_COURSE_ID,
    name: 'B1 Spanish from Template',
    sessionCount: 5,
    entries: [
      { id: 't1', orderIndex: 1, topic: 'Presentarse: Dar y pedir los datos personales', grammarFocus: 'El género, Los verbos ser y llamarse', competencies: 'reading,writing,listening,speaking', lessonType: 'Communicative', lessonId: null, status: 'planned' },
      { id: 't2', orderIndex: 2, topic: 'Nosotros: Conocer a los compañeros', grammarFocus: 'Las tres conjugaciones: -ar, -er, -ir', competencies: 'reading,writing,listening,speaking', lessonType: 'Communicative', lessonId: null, status: 'planned' },
    ],
  }

  // Mock curriculum templates endpoint
  await page.route('**/api/curriculum-templates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEMPLATES) })
  })

  // Mock POST /api/courses - verify templateLevel is sent
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.templateLevel).toBe('B1.1')
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(TEMPLATE_COURSE) })
    } else {
      await route.continue()
    }
  })

  await page.route(`**/api/courses/${TEMPLATE_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMPLATE_COURSE) })
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  // Fill in form
  await page.getByTestId('course-name').fill('B1 Spanish from Template')

  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await expect(page.getByTestId('language-select')).toContainText('Spanish', { timeout: UI_TIMEOUT })

  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('B1', { timeout: UI_TIMEOUT })

  // Toggle template use
  await expect(page.getByTestId('use-template-checkbox')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('use-template-checkbox').check()

  // Select the template
  await expect(page.getByTestId('template-select')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-select').click()
  await page.getByRole('option', { name: /B1\.1/ }).click()
  await expect(page.getByTestId('template-select')).toContainText('B1.1', { timeout: UI_TIMEOUT })

  // Session count picker should be hidden when template is selected
  await expect(page.getByTestId('session-count-select')).not.toBeVisible()

  // Template preview card should be visible with sample grammar
  await expect(page.getByTestId('template-preview')).toBeVisible({ timeout: UI_TIMEOUT })

  // Button label changes
  await expect(page.getByTestId('generate-curriculum-btn')).toHaveText('Create from Template')

  // Submit
  await page.getByTestId('generate-curriculum-btn').click()

  // Should navigate to course detail
  await expect(page).toHaveURL(new RegExp(`/courses/${TEMPLATE_COURSE_ID}`), { timeout: UI_TIMEOUT })

  await context.close()
})

test('A1 templates appear in dropdown when A1 is selected', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const A1_MOCK_TEMPLATES = [
    { level: 'A1.1', cefrLevel: 'A1', unitCount: 6, sampleGrammar: ['Verbo llamarse', 'Artículos definidos'] },
    { level: 'A1.2', cefrLevel: 'A1', unitCount: 5, sampleGrammar: ['Presente indicativo'] },
    { level: 'A1.3', cefrLevel: 'A1', unitCount: 4, sampleGrammar: ['Números y fechas'] },
  ]

  await page.route('**/api/curriculum-templates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(A1_MOCK_TEMPLATES) })
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await expect(page.getByTestId('language-select')).toContainText('Spanish', { timeout: UI_TIMEOUT })

  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'A1' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('A1', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('use-template-checkbox')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('use-template-checkbox').check()

  await expect(page.getByTestId('template-select')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('template-select').click()

  await expect(page.getByRole('option', { name: /A1\.1/ })).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByRole('option', { name: /A1\.2/ })).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByRole('option', { name: /A1\.3/ })).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByRole('option', { name: /B1/ })).not.toBeVisible()

  await context.close()
})
