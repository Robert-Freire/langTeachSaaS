/**
 * Carmen Persona — B2.1 Spanish teacher, English L1 student
 *
 * Teacher: Carmen. Student: [QA] James. Level: B2.1. L1: English.
 * Template: Reading. Topic: "The Spanish political system"
 * Weakness: subjunctive mood
 *
 * Student names use [QA] prefix to prevent collisions with manually created
 * students in the persistent QA database.
 *
 * Run via SKILL.md agent or directly:
 *   npx playwright test tests/carmen-b2.spec.ts --config playwright.config.ts
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
  name: 'Carmen',
  student: {
    name: '[QA] James',
    language: 'Spanish',
    cefrLevel: 'B2.1',
    nativeLanguage: 'English',
    interests: ['politics', 'literature'],
    difficulties: [
      { description: 'subjunctive mood usage in complex sentences', category: 'Grammar', severity: 'Medium' },
    ],
  },
  lesson: {
    templateName: 'Reading',
    title: '[QA] The Spanish Political System — B2.1',
    language: 'Spanish',
    cefrLevel: 'B2.1',
    topic: 'The Spanish political system',
  },
}

test('Carmen B2.1 — create student, generate lesson, capture output', async ({ browser }) => {
  const outputDir = path.resolve(
    __dirname,
    '../../output',
    `carmen-b2-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  )

  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // 1. Ensure student [QA] James exists (create if first run, reuse on subsequent runs)
  const studentId = await upsertStudent(page, PERSONA.student)

  // 2. Create lesson
  const lessonData = { ...PERSONA.lesson, studentId }
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

  // 9. Sanity check — pedagogical evaluation happens in SKILL.md by Claude
  expect(content.sections.length).toBeGreaterThan(0)
  const totalBlocks = content.sections.reduce((sum, s) => sum + s.blocks.length, 0)
  expect(totalBlocks).toBeGreaterThan(0)

  // 10. Save output for SKILL.md agent to evaluate
  saveRunOutput(outputDir, content, {
    persona: PERSONA.name,
    lessonId,
    studentId,
    branch: process.env.QA_BRANCH ?? 'unknown',
    generationDurationMs: durationMs,
    studentViewCaptured,
    pdfExportSucceeded,
    timestamp: new Date().toISOString(),
    outputDir,
  })

  console.log(`Carmen B2.1 run complete. Output: ${outputDir}`)
  console.log(`Generation took ${Math.round(durationMs / 1000)}s. ${totalBlocks} blocks across ${content.sections.length} sections.`)
  console.log(`Artifacts: student-view=${studentViewCaptured}, pdf=${pdfExportSucceeded}`)

  await context.close()
})
