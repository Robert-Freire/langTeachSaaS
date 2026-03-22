/**
 * Ana Persona — A1.1 Spanish teacher, English L1 student
 *
 * Teacher: Ana. Student: Emma. Level: A1.1. L1: English.
 * Template: Conversation. Topic: "ordering at a restaurant"
 *
 * Run via SKILL.md agent or directly:
 *   npx playwright test tests/ana-a1.spec.ts --config playwright.config.ts
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
  saveRunOutput,
} from '../helpers/navigation'

const PERSONA = {
  name: 'Ana',
  student: {
    name: 'Emma',
    language: 'Spanish',
    cefrLevel: 'A1.1',
    nativeLanguage: 'English',
    interests: ['travel', 'food'],
  },
  lesson: {
    templateName: 'Conversation',
    title: '[QA] Ordering at a Restaurant — A1.1',
    language: 'Spanish',
    cefrLevel: 'A1.1',
    topic: 'ordering at a restaurant',
  },
}

test('Ana A1.1 — create student, generate lesson, capture output', async ({ browser }) => {
  const outputDir = path.resolve(
    __dirname,
    '../../output',
    `ana-a1-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  )

  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // 1. Ensure student Emma exists (create if first run, reuse on subsequent runs)
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

  // 6. Screenshot student view
  await screenshotStudentView(page, lessonId, outputDir)

  // 7. Extract lesson content from API
  const content = await extractLessonContent(page, lessonId, {
    studentName: PERSONA.student.name,
    template: PERSONA.lesson.templateName,
    level: PERSONA.lesson.cefrLevel,
    l1: PERSONA.student.nativeLanguage,
    topic: PERSONA.lesson.topic,
  })

  // 8. Verify we have content to evaluate (sanity check only — pedagogical
  //    evaluation happens in SKILL.md by Claude, not in this Playwright spec)
  expect(content.sections.length).toBeGreaterThan(0)
  const totalBlocks = content.sections.reduce((sum, s) => sum + s.blocks.length, 0)
  expect(totalBlocks).toBeGreaterThan(0)

  // 9. Save output for SKILL.md agent to evaluate
  saveRunOutput(outputDir, content, {
    persona: PERSONA.name,
    lessonId,
    studentId,
    branch: process.env.QA_BRANCH ?? 'unknown',
    generationDurationMs: durationMs,
    timestamp: new Date().toISOString(),
    outputDir,
  })

  console.log(`Ana A1.1 run complete. Output: ${outputDir}`)
  console.log(`Generation took ${Math.round(durationMs / 1000)}s. ${totalBlocks} blocks across ${content.sections.length} sections.`)

  await context.close()
})
