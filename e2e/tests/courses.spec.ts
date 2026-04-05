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
  warnings: null,
  dismissedWarningKeys: null,
  entries: [
    { id: 'e1', orderIndex: 1, topic: 'Greetings and Introductions', grammarFocus: 'Present simple', competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: 'Ana introduces herself at language school', personalizationNotes: 'Prioritized oral production based on student goals', vocabularyThemes: 'Greetings,Names,Countries' },
    { id: 'e2', orderIndex: 2, topic: 'Daily Routines', grammarFocus: 'Present simple habits', competencies: 'reading,writing', lessonType: 'Mixed', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: 'Time expressions,Activities' },
    { id: 'e3', orderIndex: 3, topic: 'Past Events', grammarFocus: 'Past simple', competencies: 'speaking,listening', lessonType: 'Grammar-focused', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e4', orderIndex: 4, topic: 'Future Plans', grammarFocus: 'Going to / will', competencies: 'writing', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e5', orderIndex: 5, topic: 'Review and Practice', grammarFocus: null, competencies: 'reading,writing,speaking,listening', lessonType: 'Mixed', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
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

  // Teacher notes textarea is hidden until a student is selected
  await expect(page.getByTestId('teacher-notes')).not.toBeVisible()

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
    sessionCount: 8,
    entries: [
      { id: 'x1', orderIndex: 1, topic: 'DELE exam overview', grammarFocus: 'Present subjunctive', competencies: 'reading,writing', lessonType: 'Input Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x2', orderIndex: 2, topic: 'Formal letter conventions', grammarFocus: null, competencies: 'writing', lessonType: 'Input Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x3', orderIndex: 3, topic: 'Time management in the exam', grammarFocus: null, competencies: 'reading,writing', lessonType: 'Strategy Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x4', orderIndex: 4, topic: 'Listening comprehension strategies', grammarFocus: null, competencies: 'listening', lessonType: 'Strategy Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x5', orderIndex: 5, topic: 'Speaking task practice', grammarFocus: null, competencies: 'speaking', lessonType: 'Input Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x6', orderIndex: 6, topic: 'Written production under conditions', grammarFocus: null, competencies: 'writing', lessonType: 'Input Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x7', orderIndex: 7, topic: 'Review exam marking criteria', grammarFocus: null, competencies: 'reading,writing', lessonType: 'Strategy Session', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      { id: 'x8', orderIndex: 8, topic: 'DELE B2 Full Mock Test', grammarFocus: null, competencies: 'reading,writing,listening,speaking', lessonType: 'Mock Test', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    ],
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

  // Verify session type badges: at least one Mock Test and one Strategy Session are visible
  await expect(page.getByTestId('session-type-badge-7')).toHaveText('Mock Test', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('session-type-badge-2')).toHaveText('Strategy Session', { timeout: UI_TIMEOUT })

  await context.close()
})

test('reorder curriculum entries via drag and drop', async ({ browser }) => {
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

  // Simulate drag of entry 0 to position of entry 1 using mouse events
  const handle0 = page.getByTestId('drag-handle-0')
  const entry1 = page.getByTestId('curriculum-entry-1')

  const handle0Box = await handle0.boundingBox()
  const entry1Box = await entry1.boundingBox()
  expect(handle0Box).not.toBeNull()
  expect(entry1Box).not.toBeNull()

  await page.mouse.move(handle0Box!.x + handle0Box!.width / 2, handle0Box!.y + handle0Box!.height / 2)
  await page.mouse.down()
  // Move past dnd-kit activation threshold (5px)
  await page.mouse.move(handle0Box!.x + handle0Box!.width / 2, handle0Box!.y + handle0Box!.height / 2 + 10)
  await page.mouse.move(handle0Box!.x + handle0Box!.width / 2, entry1Box!.y + entry1Box!.height / 2)
  await page.mouse.up()

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

test('generate lesson from curriculum entry navigates to LessonNew pre-filled', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const STUDENT_COURSE_ID = '00000000-0000-0000-0000-000000000096'
  const courseWithStudent = {
    ...MOCK_COURSE,
    id: STUDENT_COURSE_ID,
    studentId: '00000000-0000-0000-0000-000000000001',
    studentName: 'Ana',
    targetCefrLevel: 'B2',
    language: 'English',
    entries: [
      { id: 'e1', orderIndex: 1, topic: 'Greetings and Introductions', grammarFocus: 'Present simple', competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      ...MOCK_COURSE.entries.slice(1),
    ],
  }

  const STUDENT_ID = '00000000-0000-0000-0000-000000000001'

  await page.route(`**/api/courses/${STUDENT_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(courseWithStudent) })
  })
  await page.route('**/api/lesson-templates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/students**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{ id: STUDENT_ID, name: 'Ana', learningLanguage: 'English', cefrLevel: 'B2', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '', updatedAt: '' }],
        totalCount: 1,
      }),
    })
  })

  const pageErrors: string[] = []
  page.on('pageerror', err => pageErrors.push(err.message))

  await page.goto(`/courses/${STUDENT_COURSE_ID}`)

  // Wait for either course-title or course-load-error to diagnose failure mode
  await Promise.race([
    page.getByTestId('course-title').waitFor({ state: 'visible', timeout: NAV_TIMEOUT }),
    page.getByTestId('course-load-error').waitFor({ state: 'visible', timeout: NAV_TIMEOUT }),
  ]).catch(async () => {
    const url = page.url()
    const bodyText = await page.locator('body').innerText().catch(() => '(could not get body text)')
    const errors = pageErrors.join('; ') || '(none)'
    throw new Error(`course page did not render in ${NAV_TIMEOUT}ms. URL: ${url}. Page errors: ${errors}. Body: ${bodyText.slice(0, 500)}`)
  })
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: UI_TIMEOUT })

  // Verify "Not generated" badge on the first planned entry
  await expect(page.getByTestId('curriculum-entry-0')).toContainText('Not generated')

  // Verify the generate lesson link has the expected URL params (check href without clicking)
  const generateLink = page.getByTestId('generate-lesson-0')
  const href = await generateLink.getAttribute('href')
  expect(href).toContain('level=B2')
  expect(href).toContain(`studentId=${STUDENT_ID}`)
  expect(href).toContain('language=English')
  expect(href).toContain('topic=Greetings')

  // Click "Generate lesson" — should navigate to LessonNew step 2 (auto-advanced due to entryId param)
  await generateLink.click()

  await expect(page).toHaveURL(/\/lessons\/new/, { timeout: UI_TIMEOUT })
  // Auto-advanced to step 2: "Lesson Details" heading is visible
  await expect(page.getByText('Lesson Details')).toBeVisible({ timeout: UI_TIMEOUT })
  // Topic is pre-filled
  await expect(page.getByTestId('input-topic')).toHaveValue('Greetings and Introductions', { timeout: UI_TIMEOUT })
  // Level is pre-filled from URL param
  await expect(page.getByTestId('select-level')).toContainText('B2', { timeout: UI_TIMEOUT })
  // Student selector shows "Ana" (students query resolved via mock)
  await expect(page.getByTestId('select-student')).toContainText('Ana', { timeout: UI_TIMEOUT })

  await context.close()
})

test('course view shows Draft badge and Edit lesson link for created entries', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const EXISTING_LESSON_ID = '00000000-0000-0000-0000-000000009999'
  const COURSE_WITH_CREATED = {
    ...MOCK_COURSE,
    entries: [
      { ...MOCK_COURSE.entries[0], lessonId: EXISTING_LESSON_ID, status: 'created' },
      ...MOCK_COURSE.entries.slice(1),
    ],
  }

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COURSE_WITH_CREATED) })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // First entry should show "Draft" badge
  await expect(page.getByTestId('curriculum-entry-0')).toContainText('Draft')

  // "Edit lesson" link should be visible and link to the lesson
  const lessonLink = page.getByTestId('lesson-link-0')
  await expect(lessonLink).toBeVisible()
  const href = await lessonLink.getAttribute('href')
  expect(href).toBe(`/lessons/${EXISTING_LESSON_ID}`)

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
      { id: 't1', orderIndex: 1, topic: 'Presentarse: Dar y pedir los datos personales', grammarFocus: 'El género, Los verbos ser y llamarse', competencies: 'reading,writing,listening,speaking', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: 'Números,Nacionalidades,Profesiones' },
      { id: 't2', orderIndex: 2, topic: 'Nosotros: Conocer a los compañeros', grammarFocus: 'Las tres conjugaciones: -ar, -er, -ir', competencies: 'reading,writing,listening,speaking', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    ],
  }

  const MOCK_MAPPING = {
    strategy: 'exact', sessionCount: 10, unitCount: 5,
    sessions: [{ sessionIndex: 1, unitRef: 'Unit 1', subFocus: 'Unit 1', rationale: '1:1', grammarFocus: null }],
    excludedUnits: [],
  }

  // Mock curriculum templates endpoint
  await page.route('**/api/curriculum-templates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEMPLATES) })
  })

  // Mock mapping preview endpoint
  await page.route('**/api/curriculum-templates/B1.1/mapping**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MAPPING) })
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

  // Session count picker is visible even when template is selected
  await expect(page.getByTestId('session-count-select')).toBeVisible()

  // Mapping preview card is shown
  await expect(page.getByTestId('session-mapping-preview')).toBeVisible({ timeout: UI_TIMEOUT })

  // Button label changes
  await expect(page.getByTestId('generate-curriculum-btn')).toHaveText('Create from Template')

  // Submit
  await page.getByTestId('generate-curriculum-btn').click()

  // Should navigate to course detail
  await expect(page).toHaveURL(new RegExp(`/courses/${TEMPLATE_COURSE_ID}`), { timeout: UI_TIMEOUT })

  await context.close()
})

test('session mapping expand: 8 sessions for 4-unit template creates 8 entries', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const EXPAND_COURSE_ID = '00000000-0000-0000-0000-000000000087'
  const TEMPLATES = [
    { level: 'A1.1', cefrLevel: 'A1', unitCount: 4, sampleGrammar: ['El género', 'El presente'] },
  ]
  const EXPAND_MAPPING = {
    strategy: 'expand', sessionCount: 8, unitCount: 4,
    sessions: Array.from({ length: 8 }, (_, i) => ({
      sessionIndex: i + 1,
      unitRef: `Unit ${Math.floor(i / 2) + 1}`,
      subFocus: i % 2 === 0 ? `Unit ${Math.floor(i / 2) + 1}: Introduction` : `Unit ${Math.floor(i / 2) + 1}: Practice`,
      rationale: 'Unit spans 2 sessions for extended practice.',
      grammarFocus: 'El género',
    })),
    excludedUnits: [],
  }
  const EXPAND_COURSE = {
    ...MOCK_COURSE,
    id: EXPAND_COURSE_ID,
    name: 'A1.1 Expanded',
    sessionCount: 8,
    entries: Array.from({ length: 8 }, (_, i) => ({
      id: `x${i + 1}`, orderIndex: i + 1, topic: `Session ${i + 1}`,
      grammarFocus: 'El género', competencies: 'reading,writing', lessonType: 'Communicative',
      lessonId: null, status: 'planned',
      templateUnitRef: null, competencyFocus: null, contextDescription: null, personalizationNotes: null,
    })),
  }

  await page.route('**/api/curriculum-templates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMPLATES) })
  })
  await page.route('**/api/curriculum-templates/A1.1/mapping**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EXPAND_MAPPING) })
  })
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.sessionCount).toBe(8)
      expect(body.templateLevel).toBe('A1.1')
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(EXPAND_COURSE) })
    } else {
      await route.continue()
    }
  })
  await page.route(`**/api/courses/${EXPAND_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EXPAND_COURSE) })
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  await page.getByTestId('course-name').fill('A1.1 Expanded')
  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await expect(page.getByTestId('language-select')).toContainText('Spanish', { timeout: UI_TIMEOUT })
  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'A1' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('A1', { timeout: UI_TIMEOUT })

  await page.getByTestId('use-template-checkbox').check()
  await page.getByTestId('template-select').click()
  await page.getByRole('option', { name: /A1\.1/ }).click()
  await expect(page.getByTestId('template-select')).toContainText('A1.1', { timeout: UI_TIMEOUT })

  // Select 8 sessions (expand strategy: 8 > 4 units)
  await page.getByTestId('session-count-select').click()
  await page.getByRole('option', { name: '8 sessions' }).click()

  // Mapping preview shows expand strategy
  await expect(page.getByTestId('session-mapping-preview')).toBeVisible({ timeout: UI_TIMEOUT })

  await page.getByTestId('generate-curriculum-btn').click()

  // Navigates to course detail with 8 entries
  await expect(page).toHaveURL(new RegExp(`/courses/${EXPAND_COURSE_ID}`), { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('course-title')).toHaveText('A1.1 Expanded', { timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('curriculum-list')).toBeVisible()
  await expect(page.getByTestId('course-progress')).toHaveText('0 of 8 lessons created')

  await context.close()
})

test('expand toggle shows vocabulary themes and personalized context', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSE) })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Details hidden by default
  await expect(page.getByTestId('entry-details-0')).not.toBeVisible()

  // Expand first entry
  await page.getByTestId('expand-entry-0').click()
  await expect(page.getByTestId('entry-details-0')).toBeVisible({ timeout: UI_TIMEOUT })

  // Vocabulary themes shown (scoped to entry-details to avoid matching topic text)
  const entryDetails = page.getByTestId('entry-details-0')
  await expect(entryDetails.getByText('Greetings', { exact: true })).toBeVisible()
  await expect(entryDetails.getByText('Countries', { exact: true })).toBeVisible()

  // Personalized context shown
  await expect(page.getByTestId('context-description-0')).toHaveText('Ana introduces herself at language school')

  // Personalization rationale shown
  await expect(page.getByTestId('personalization-notes-0')).toContainText('Prioritized oral production')

  // Collapse again
  await page.getByTestId('expand-entry-0').click()
  await expect(page.getByTestId('entry-details-0')).not.toBeVisible()

  await context.close()
})

test('course summary header shows key stats', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const courseWithStudent = {
    ...MOCK_COURSE,
    studentName: 'Ana',
    studentId: 's1',
    lessonsCreated: 2,
  }

  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(courseWithStudent) })
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  await expect(page.getByTestId('course-summary-header')).toBeVisible()
  await expect(page.getByTestId('summary-sessions')).toContainText('5')
  await expect(page.getByTestId('summary-level')).toContainText('B2')
  await expect(page.getByTestId('summary-student')).toContainText('Ana')
  await expect(page.getByTestId('summary-mode')).toContainText('General Learning')
  await expect(page.getByTestId('summary-progress')).toContainText('2/5')
  await expect(page.getByTestId('course-progress')).toContainText('2 of 5 lessons created')

  await context.close()
})

test('add session appends new entry to curriculum', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const newEntry = {
    id: 'e-new',
    orderIndex: 6,
    topic: 'Travel Vocabulary',
    grammarFocus: null,
    competencies: 'reading',
    lessonType: null,
    lessonId: null,
    status: 'planned',
    contextDescription: null,
    personalizationNotes: null,
    vocabularyThemes: null,
  }
  const updatedCourse = { ...MOCK_COURSE, entries: [...MOCK_COURSE.entries, newEntry] }

  let getCallCount = 0
  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    getCallCount++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getCallCount === 1 ? MOCK_COURSE : updatedCourse),
    })
  })
  await page.route(`**/api/courses/${MOCK_COURSE_ID}/curriculum`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newEntry) })
    } else {
      await route.continue()
    }
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Open add form
  await page.getByTestId('add-entry-btn').click()
  await expect(page.getByTestId('add-entry-form')).toBeVisible()

  // Fill in topic and save
  await page.getByTestId('add-topic').fill('Travel Vocabulary')
  await page.getByTestId('save-add-entry-btn').click()

  // After save, new entry appears in list
  await expect(page.getByText('Travel Vocabulary')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('remove session removes entry from curriculum after confirmation', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const courseAfterDelete = {
    ...MOCK_COURSE,
    entries: MOCK_COURSE.entries.slice(1).map((e, i) => ({ ...e, orderIndex: i + 1 })),
  }

  let getCallCount = 0
  await page.route(`**/api/courses/${MOCK_COURSE_ID}`, async (route) => {
    getCallCount++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getCallCount === 1 ? MOCK_COURSE : courseAfterDelete),
    })
  })
  await page.route(`**/api/courses/${MOCK_COURSE_ID}/curriculum/e1`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 })
    } else {
      await route.continue()
    }
  })

  await page.goto(`/courses/${MOCK_COURSE_ID}`)
  await expect(page.getByTestId('course-title')).toHaveText('B2 English Course', { timeout: NAV_TIMEOUT })

  // Click delete on first entry
  await page.getByTestId('delete-entry-0').click()

  // Confirm dialog appears
  await expect(page.getByText('Remove session?')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('confirm-delete-ok').click()

  // After removal, first entry is now "Daily Routines"
  await expect(page.getByTestId('curriculum-entry-0')).toContainText('Daily Routines', { timeout: UI_TIMEOUT })
  await expect(page.getByText('Greetings and Introductions')).not.toBeVisible()

  await context.close()
})

test('full happy path: student edit → CourseNew (locked) → generate → CourseDetail with personalized session', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const PERSONALIZED_COURSE_ID = '00000000-0000-0000-0000-000000000097'
  const personalizedCourse = {
    ...MOCK_COURSE,
    id: PERSONALIZED_COURSE_ID,
    name: 'A1 Spanish for Marco',
    language: 'Spanish',
    targetCefrLevel: 'A1',
    sessionCount: 12,
    studentId: null as string | null,
    studentName: 'Marco',
    entries: [
      {
        id: 'p1', orderIndex: 1, topic: 'Saludos y presentaciones', grammarFocus: 'Verbo llamarse',
        competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned',
        contextDescription: 'Marco introduces himself at his new office in Barcelona',
        personalizationNotes: 'Focused on workplace greetings for relocation context',
        vocabularyThemes: 'Saludos,Trabajo,Barcelona',
      },
      { id: 'p2', orderIndex: 2, topic: 'En la ciudad', grammarFocus: 'Preposiciones de lugar', competencies: 'reading,speaking', lessonType: 'Communicative', lessonId: null, status: 'planned', contextDescription: null, personalizationNotes: null, vocabularyThemes: 'Ciudad,Transporte' },
    ],
  }

  // Create a student with full Spanish A1 profile
  const studentName = `Marco Test ${Date.now()}`
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'A1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: NAV_TIMEOUT })

  // Navigate to student edit page
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await expect(studentCard).toBeVisible({ timeout: NAV_TIMEOUT })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: NAV_TIMEOUT })

  const editUrl = page.url()
  const studentId = editUrl.match(/\/students\/([^/]+)\/edit/)?.[1]
  expect(studentId).toBeTruthy()

  // Mock course creation and retrieval
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...personalizedCourse, studentId }) })
    } else {
      await route.continue()
    }
  })
  await page.route(`**/api/courses/${PERSONALIZED_COURSE_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...personalizedCourse, studentId }) })
  })

  // Click Create Course button
  const createCourseBtn = page.getByTestId('create-course-btn')
  await expect(createCourseBtn).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(createCourseBtn).not.toBeDisabled()
  await createCourseBtn.click()

  // CourseNew: student locked, language + CEFR auto-filled
  await expect(page).toHaveURL(`/courses/new?studentId=${studentId}`, { timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('student-locked')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('student-locked')).toContainText(studentName)
  await expect(page.getByTestId('language-select')).toContainText('Spanish', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('cefr-select')).toContainText('A1', { timeout: UI_TIMEOUT })

  // Fill remaining required field (course name) and generate
  await page.getByTestId('course-name').fill('A1 Spanish for Marco')
  await page.getByTestId('generate-curriculum-btn').click()

  // Should navigate to CourseDetail
  await expect(page).toHaveURL(new RegExp(`/courses/${PERSONALIZED_COURSE_ID}`), { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('course-title')).toHaveText('A1 Spanish for Marco', { timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('curriculum-list')).toBeVisible()
  await expect(page.getByText('Saludos y presentaciones')).toBeVisible()

  // Expand first entry and verify personalized context is shown
  await page.getByTestId('expand-entry-0').click()
  await expect(page.getByTestId('context-description-0')).toContainText('Barcelona', { timeout: UI_TIMEOUT })

  await context.close()
})

test('generation failure: error card shown and form stays interactive for retry', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Mock POST /api/courses to return a server error
  await page.route('**/api/courses', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'AI generation failed. Please try again.' }) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/courses/new')
  await expect(page.locator('h1')).toHaveText('New Course', { timeout: NAV_TIMEOUT })

  await page.getByTestId('course-name').fill('Test Course')
  await page.getByTestId('language-select').click()
  await page.getByRole('option', { name: 'English' }).click()
  await expect(page.getByTestId('language-select')).toContainText('English', { timeout: UI_TIMEOUT })
  await page.getByTestId('cefr-select').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await expect(page.getByTestId('cefr-select')).toContainText('B1', { timeout: UI_TIMEOUT })

  await page.getByTestId('generate-curriculum-btn').click()

  // Error card should appear
  await expect(page.getByTestId('generation-error')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('generation-error')).toContainText('AI generation failed', { timeout: UI_TIMEOUT })

  // Form should remain visible (not replaced by loading spinner)
  await expect(page.getByTestId('generate-curriculum-btn')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('generate-curriculum-btn')).not.toBeDisabled()

  // URL should not have changed (still on CourseNew, not CourseDetail)
  await expect(page).toHaveURL('/courses/new')

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
