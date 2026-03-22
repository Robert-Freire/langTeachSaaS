import { Page, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentData {
  name: string
  language: string       // e.g. "Spanish"
  cefrLevel: string      // e.g. "A1.1"
  nativeLanguage?: string // e.g. "English"
  interests?: string[]
  difficulties?: Array<{ description: string; category: string; severity: string }>
}

export interface LessonData {
  templateName: string  // e.g. "Conversation", "Grammar" — matches template card test-id
  title: string
  language: string
  cefrLevel: string
  topic: string
  studentId?: string
}

export interface LessonContent {
  lessonId: string
  studentName: string
  lessonTitle: string
  lessonTopic: string
  template: string
  level: string
  l1: string | undefined
  sections: Array<{
    sectionType: string
    blocks: Array<{
      blockType: string
      rawContent: string
    }>
  }>
  generationDurationMs?: number
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * Returns the ID of a student matching the given name, or null if not found.
 * Uses API interception — requires being on any app page.
 */
export async function findStudentByName(page: Page, name: string): Promise<string | null> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'

  // Navigate to students list which triggers GET /api/students
  const [studentsResponse] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/students') && resp.status() === 200),
    page.goto(`${baseURL}/students`),
  ])

  const body: { items: Array<{ id: string; name: string }> } = await studentsResponse.json()
  const students = body.items ?? []
  const match = students.find(s => s.name.toLowerCase() === name.toLowerCase())
  return match?.id ?? null
}

/**
 * Creates a student and returns the new student's ID.
 * Navigates to /students/new, fills the form, submits, and captures the
 * created student's ID from the redirect URL.
 */
export async function createStudent(page: Page, data: StudentData): Promise<string> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  await page.goto(`${baseURL}/students/new`)

  // Name
  await page.fill('[data-testid="student-name"]', data.name)

  // Target language (Spanish)
  await page.locator('[data-testid="student-language"]').click()
  await page.getByRole('option', { name: data.language }).click()

  // CEFR level
  await page.locator('[data-testid="student-cefr"]').click()
  await page.getByRole('option', { name: data.cefrLevel }).click()

  // Native language
  if (data.nativeLanguage) {
    await page.locator('[data-testid="student-native-language"]').click()
    await page.getByRole('option', { name: data.nativeLanguage }).click()
  }

  // Interests (typed chips)
  if (data.interests) {
    for (const interest of data.interests) {
      await page.fill('[data-testid="interest-input"]', interest)
      await page.keyboard.press('Enter')
    }
  }

  // Difficulties
  if (data.difficulties) {
    for (const diff of data.difficulties) {
      await page.click('[data-testid="add-difficulty"]')
      const rows = page.locator('[data-testid="difficulty-row"]')
      const lastRow = rows.last()
      await lastRow.locator('[data-testid="difficulty-item"]').fill(diff.description)

      await lastRow.locator('[data-testid="difficulty-category"]').click()
      await page.getByRole('option', { name: diff.category }).click()

      await lastRow.locator('[data-testid="difficulty-severity"]').click()
      await page.getByRole('option', { name: diff.severity }).click()
    }
  }

  // Submit and capture created student ID from redirect
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/students') && resp.request().method() === 'POST' && resp.status() === 201,
      { timeout: 15000 }
    ),
    page.click('[type="submit"]'),
  ])

  const created: { id: string } = await response.json()
  return created.id
}

/**
 * Ensures a student exists (creates if not found). Returns the student ID.
 */
export async function upsertStudent(page: Page, data: StudentData): Promise<string> {
  const existing = await findStudentByName(page, data.name)
  if (existing) return existing
  return createStudent(page, data)
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/**
 * Creates a lesson via the /lessons/new UI. Returns the new lesson ID.
 */
export async function createLesson(page: Page, data: LessonData): Promise<string> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  await page.goto(`${baseURL}/lessons/new`)

  // Select template if specified
  if (data.templateName) {
    const templateTestId = `template-${data.templateName.replace(/\s+/g, '-').toLowerCase()}`
    const templateCard = page.locator(`[data-testid="${templateTestId}"]`)
    try {
      await templateCard.waitFor({ state: 'visible', timeout: 5000 })
      await templateCard.click()
    } catch {
      // Template card not found — proceed without selecting a template
    }
  }

  // Title
  await page.fill('[data-testid="input-title"]', data.title)

  // Language
  await page.locator('[data-testid="select-language"]').click()
  await page.getByRole('option', { name: data.language }).click()

  // CEFR level
  await page.locator('[data-testid="select-level"]').click()
  await page.getByRole('option', { name: data.cefrLevel }).click()

  // Topic
  await page.fill('[data-testid="input-topic"]', data.topic)

  // Link student
  if (data.studentId) {
    await page.locator('[data-testid="select-student"]').click()
    // Wait for the options list to be populated (student data loads async)
    await page.waitForSelector(`[role="option"]`, { timeout: 10000 })
    // Select the option with the matching data-value attribute
    const option = page.locator(`[role="option"][data-value="${data.studentId}"]`)
    if (!(await option.isVisible({ timeout: 5000 }))) {
      throw new Error(`Student option with id "${data.studentId}" not found in dropdown — cannot link lesson to wrong student`)
    }
    await option.click()
  }

  // Submit
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/lessons') && resp.request().method() === 'POST' && resp.status() === 201,
      { timeout: 15000 }
    ),
    page.click('[data-testid="submit-lesson"]'),
  ])

  const created: { id: string } = await response.json()
  return created.id
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Triggers full lesson generation and waits for all sections to complete.
 * Returns the total duration in milliseconds.
 */
export async function triggerFullGeneration(page: Page): Promise<number> {
  const start = Date.now()

  // Click the main generate button to open the confirm dialog
  await page.click('[data-testid="generate-full-lesson-btn"]')

  // Confirm generation
  await page.click('[data-testid="confirm-generate-full-lesson"]')

  // Wait for the progress indicator to appear
  await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 30000 })

  // Wait until generation is done: all section status items show "done" state.
  // The button shows "Lesson generated!" text when phase === 'done'.
  // Allow up to 3 minutes for real Claude API calls.
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="generate-full-lesson-btn"]')
      return btn?.textContent?.includes('Lesson generated!')
    },
    { timeout: 180_000 }
  )

  return Date.now() - start
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

/**
 * Extracts lesson content from the API response by navigating to the lesson
 * editor and intercepting the GET /api/lessons/{id} response.
 */
export async function extractLessonContent(
  page: Page,
  lessonId: string,
  personaContext: { studentName: string; template: string; level: string; l1: string | undefined; topic: string }
): Promise<LessonContent> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'

  // Navigate to lesson editor and intercept the lesson data response
  const [lessonResponse] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes(`/api/lessons/${lessonId}`) && resp.status() === 200,
      { timeout: 30000 }
    ),
    page.goto(`${baseURL}/lessons/${lessonId}`),
  ])

  const lessonData = await lessonResponse.json()

  // Build content structure from API response
  const sections = (lessonData.sections ?? []).map((section: {
    sectionType: string;
    contentBlocks?: Array<{ blockType: string; rawContent: string }>
  }) => ({
    sectionType: section.sectionType,
    blocks: (section.contentBlocks ?? []).map((block: { blockType: string; rawContent: string }) => ({
      blockType: block.blockType,
      rawContent: block.rawContent ?? '',
    })),
  }))

  return {
    lessonId,
    studentName: personaContext.studentName,
    lessonTitle: lessonData.title ?? '',
    lessonTopic: lessonData.topic ?? personaContext.topic,
    template: personaContext.template,
    level: personaContext.level,
    l1: personaContext.l1,
    sections,
  }
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/**
 * Takes a screenshot of the lesson editor and saves it to the output directory.
 */
export async function screenshotTeacherView(page: Page, outputDir: string, filename = 'lesson-editor.png'): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true })
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true })
}

/**
 * Navigates to the student study view and takes a screenshot.
 * Returns true if successful, false if the view is unavailable (non-fatal).
 */
export async function screenshotStudentView(page: Page, lessonId: string, outputDir: string): Promise<boolean> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  try {
    await page.goto(`${baseURL}/lessons/${lessonId}/study`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    fs.mkdirSync(outputDir, { recursive: true })
    await page.screenshot({ path: path.join(outputDir, 'student-view.png'), fullPage: true })
    return true
  } catch (err) {
    console.warn(`[teacher-qa] Student view unavailable for lesson ${lessonId}: ${err}`)
    return false
  }
}

/**
 * Triggers the PDF export (teacher copy), waits for the download to start,
 * and takes a screenshot of the export menu.
 * Returns true if the download started successfully, false on failure (non-fatal —
 * the lesson content evaluation can still proceed without the PDF).
 */
export async function screenshotPdfExport(page: Page, lessonId: string, outputDir: string): Promise<boolean> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  try {
    // Navigate to the lesson editor (may already be there, but navigate to ensure clean state)
    await page.goto(`${baseURL}/lessons/${lessonId}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Open the export dropdown
    const exportBtn = page.locator('[data-testid="export-pdf-btn"]')
    await exportBtn.waitFor({ state: 'visible', timeout: 10000 })
    await exportBtn.click()

    // Screenshot the open export menu
    fs.mkdirSync(outputDir, { recursive: true })
    await page.screenshot({ path: path.join(outputDir, 'pdf-export-menu.png') })

    // Wait for the teacher copy download
    const teacherOption = page.locator('[data-testid="export-teacher"]')
    await teacherOption.waitFor({ state: 'visible', timeout: 5000 })

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      teacherOption.click(),
    ])

    // Verify the download completed (suggestedFilename should end in .pdf)
    const filename = download.suggestedFilename()
    if (!filename.endsWith('.pdf')) {
      throw new Error(`Unexpected PDF filename: ${filename}`)
    }

    console.log(`[teacher-qa] PDF export succeeded: ${filename}`)
    return true
  } catch (err) {
    console.warn(`[teacher-qa] PDF export failed for lesson ${lessonId}: ${err}`)
    return false
  }
}

// ---------------------------------------------------------------------------
// Output persistence
// ---------------------------------------------------------------------------

/**
 * Saves all persona run outputs to the output directory.
 */
export function saveRunOutput(
  outputDir: string,
  content: LessonContent,
  metadata: Record<string, unknown>
): void {
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'lesson-content.json'), JSON.stringify(content, null, 2))
  fs.writeFileSync(path.join(outputDir, 'run-metadata.json'), JSON.stringify(metadata, null, 2))
}
