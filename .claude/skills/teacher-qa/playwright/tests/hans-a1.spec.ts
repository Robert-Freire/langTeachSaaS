/**
 * Hans Persona — A1 Spanish teacher, German L1 student
 *
 * Teacher: Hans. Student: [QA] Lena. Level: A1.2. L1: German.
 * Template: Grammar Focus. Topic: "articles and gender in everyday nouns"
 *
 * Student names use [QA] prefix to prevent collisions with manually created
 * students in the persistent QA database.
 *
 * Run via SKILL.md agent or directly:
 *   npx playwright test tests/hans-a1.spec.ts --config playwright.config.ts
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { createQAAuthContext } from '../helpers/auth'
import {
  upsertStudent,
  createLesson,
  triggerFullGeneration,
  extractLessonContent,
  screenshotTeacherView,
  screenshotStudentView,
  screenshotPdfExport,
  saveRunOutput,
} from '../helpers/navigation'

const PERSONA = {
  name: 'Hans',
  student: {
    name: '[QA] Lena',
    language: 'Spanish',
    cefrLevel: 'A1',
    nativeLanguage: 'German',
    interests: ['music', 'sports'],
    difficulties: [
      { description: 'article gender (der/die/das vs el/la)', category: 'Grammar', severity: 'High' },
    ],
  },
  lesson: {
    templateName: 'Grammar Focus',
    title: '[QA] Articles and Gender in Everyday Nouns — A1.2',
    language: 'Spanish',
    cefrLevel: 'A1',
    topic: 'articles and gender in everyday nouns',
  },
}

test('Hans A1.2 — create student, generate lesson, capture output', async ({ browser }) => {
  const outputDir = path.resolve(
    __dirname,
    '../../output',
    `hans-a1-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  )

  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // 1. Ensure student [QA] Lena exists (create if first run, reuse on subsequent runs)
  await upsertStudent(page, PERSONA.student)

  // 2. Create lesson
  const lessonData = { ...PERSONA.lesson, studentName: PERSONA.student.name }
  const lessonId = await createLesson(page, lessonData)

  // 3. Navigate to lesson editor
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  await page.goto(`${baseURL}/lessons/${lessonId}`)
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // 4. Trigger AI generation (real Claude API — allow up to 3 minutes)
  const durationMs = await triggerFullGeneration(page)

  // 5. Screenshot teacher view
  await screenshotTeacherView(page, outputDir, 'lesson-editor.png')

  // 6. Screenshot student view (non-fatal — study view may not be available)
  const studentViewCaptured = await screenshotStudentView(page, lessonId, outputDir)

  // 7. PDF export — trigger download and screenshot the export menu
  const pdfExportSucceeded = await screenshotPdfExport(page, lessonId, outputDir)

  // 8. Extract lesson content from API
  const content = await extractLessonContent(page, lessonId, {
    studentName: PERSONA.student.name,
    template: PERSONA.lesson.templateName,
    level: PERSONA.lesson.cefrLevel,
    l1: PERSONA.student.nativeLanguage,
    topic: PERSONA.lesson.topic,
  })

  // 9. Verify we have content to evaluate (sanity check only — pedagogical
  //    evaluation happens in SKILL.md by Claude, not in this Playwright spec)
  expect(content.sections.length).toBeGreaterThan(0)
  const totalBlocks = content.sections.reduce((sum, s) => sum + s.blocks.length, 0)
  expect(totalBlocks).toBeGreaterThan(0)

  // 10. Save output for SKILL.md agent to evaluate
  saveRunOutput(outputDir, content, {
    persona: PERSONA.name,
    lessonId,
    studentId: undefined,
    branch: process.env.QA_BRANCH ?? 'unknown',
    generationDurationMs: durationMs,
    studentViewCaptured,
    pdfExportSucceeded,
    timestamp: new Date().toISOString(),
    outputDir,
  })

  console.log(`Hans A1.2 run complete. Output: ${outputDir}`)
  console.log(`Generation took ${Math.round(durationMs / 1000)}s. ${totalBlocks} blocks across ${content.sections.length} sections.`)
  console.log(`Artifacts: student-view=${studentViewCaptured}, pdf=${pdfExportSucceeded}`)

  await context.close()
})
