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
  studentName?: string  // Display name as shown in the dropdown option
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
  // resourceType check excludes Vite-served JS files whose URL also contains '/api/students'
  const [studentsResponse] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/students') && resp.status() === 200 && resp.request().resourceType() === 'xhr'
    ),
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
  if (data.studentName) {
    await page.locator('[data-testid="select-student"]').click()
    await page.getByRole('option', { name: data.studentName }).click()
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

  // Wait until generation is done.
  // "Lesson generated!" appears in the AlertDialogTitle (not on the button).
  // After 2 seconds, the dialog auto-closes and returns to idle.
  // Allow up to 8 minutes for real Claude API calls (multiple sections, streamed sequentially).
  await page.waitForFunction(
    () => document.body.textContent?.includes('Lesson generated!') ||
          document.body.textContent?.includes('All sections complete'),
    { timeout: 480_000 }
  )

  // Wait for the dialog to auto-close (2-second timer after done)
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="generation-progress"]'),
    { timeout: 10_000 }
  )

  return Date.now() - start
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

/**
 * Extracts lesson content by fetching lesson metadata (sections) and content blocks separately.
 * GET /api/lessons/{id} returns sections (no blocks).
 * GET /api/lessons/{id}/content-blocks returns the generated blocks, keyed by sectionId.
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
      resp => resp.url().includes(`/api/lessons/${lessonId}`) && !resp.url().includes('/content-blocks') && resp.status() === 200 && resp.request().resourceType() === 'xhr',
      { timeout: 30000 }
    ),
    page.goto(`${baseURL}/lessons/${lessonId}`),
  ])

  const lessonData = await lessonResponse.json()

  // Fetch content blocks separately (not included in the lesson GET response)
  const blocksResponse = await page.waitForResponse(
    resp => resp.url().includes(`/api/lessons/${lessonId}/content-blocks`) && resp.status() === 200 && resp.request().resourceType() === 'xhr',
    { timeout: 30000 }
  )
  const blocksData: Array<{ lessonSectionId: string | null; blockType: string; generatedContent: string; editedContent: string | null }> = await blocksResponse.json()

  // Group blocks by section ID
  const blocksBySectionId = new Map<string, typeof blocksData>()
  for (const block of blocksData) {
    if (block.lessonSectionId) {
      const existing = blocksBySectionId.get(block.lessonSectionId) ?? []
      existing.push(block)
      blocksBySectionId.set(block.lessonSectionId, existing)
    }
  }

  // Build content structure combining sections + blocks
  const sections = (lessonData.sections ?? []).map((section: { id: string; sectionType: string }) => {
    const sectionBlocks = blocksBySectionId.get(section.id) ?? []
    return {
      sectionType: section.sectionType,
      blocks: sectionBlocks.map(block => ({
        blockType: block.blockType,
        rawContent: block.editedContent ?? block.generatedContent ?? '',
      })),
    }
  })

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
