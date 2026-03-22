/**
 * Sprint Reviewer Persona — dynamic integration test
 *
 * Unlike fixed personas, the Sprint Reviewer designs its test scenario dynamically
 * based on what features were completed in the current sprint (closed issues +
 * "Ready to Test" issues). The SKILL.md agent reads the sprint issues, selects a
 * topic that exercises those features together, and passes it via QA_SPRINT_TOPIC.
 *
 * Student: [QA] Sprint Tester. Level: B1. L1: English.
 * Template: Grammar Focus (default — covers broad feature surface).
 * Topic: from QA_SPRINT_TOPIC env var (default: "everyday situations in Spanish")
 *
 * Sprint issues context is passed via QA_SPRINT_ISSUES_JSON env var and saved
 * to run-metadata.json so the SKILL.md agent can include it in the report.
 *
 * Run via SKILL.md agent (after it sets QA_SPRINT_TOPIC):
 *   QA_SPRINT_TOPIC="..." QA_SPRINT_ISSUES_JSON='[...]' npx playwright test tests/sprint-reviewer.spec.ts --config playwright.config.ts
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

const sprintTopic = process.env.QA_SPRINT_TOPIC ?? 'everyday situations in Spanish'
const sprintIssuesRaw = process.env.QA_SPRINT_ISSUES_JSON ?? '[]'

let sprintIssues: unknown[]
try {
  sprintIssues = JSON.parse(sprintIssuesRaw)
} catch {
  console.warn(`[sprint-reviewer] QA_SPRINT_ISSUES_JSON could not be parsed — sprint context will be empty. Value: ${sprintIssuesRaw.slice(0, 100)}`)
  sprintIssues = []
}

const PERSONA = {
  name: 'Sprint Reviewer',
  student: {
    name: '[QA] Sprint Tester',
    language: 'Spanish',
    cefrLevel: 'B1',
    nativeLanguage: 'English',
    interests: ['daily life', 'work situations'],
  },
  lesson: {
    templateName: 'Grammar Focus',
    title: `[QA] Sprint Review — ${sprintTopic.slice(0, 40)}`,
    language: 'Spanish',
    cefrLevel: 'B1',
    topic: sprintTopic,
  },
}

test('Sprint Reviewer — integration test for current sprint features', async ({ browser }) => {
  const outputDir = path.resolve(
    __dirname,
    '../../output',
    `sprint-reviewer-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  )

  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // 1. Ensure student [QA] Sprint Tester exists (create if first run, reuse on subsequent runs)
  await upsertStudent(page, PERSONA.student)

  // 2. Create lesson with the sprint-specific topic
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

  // 6. Screenshot student view (non-fatal)
  const studentViewCaptured = await screenshotStudentView(page, lessonId, outputDir)

  // 7. PDF export
  const pdfExportSucceeded = await screenshotPdfExport(page, lessonId, outputDir)

  // 8. Extract lesson content from API
  const content = await extractLessonContent(page, lessonId, {
    studentName: PERSONA.student.name,
    template: PERSONA.lesson.templateName,
    level: PERSONA.lesson.cefrLevel,
    l1: PERSONA.student.nativeLanguage,
    topic: PERSONA.lesson.topic,
  })

  // 9. Sanity check
  expect(content.sections.length).toBeGreaterThan(0)
  const totalBlocks = content.sections.reduce((sum, s) => sum + s.blocks.length, 0)
  expect(totalBlocks).toBeGreaterThan(0)

  // 10. Save output — include sprint issues so SKILL.md agent can write the Sprint Integration Assessment
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
    sprintIssues,
    sprintTopic,
  })

  console.log(`Sprint Reviewer run complete. Output: ${outputDir}`)
  console.log(`Topic: "${sprintTopic}"`)
  console.log(`Sprint issues: ${sprintIssues.length} items`)
  console.log(`Generation took ${Math.round(durationMs / 1000)}s. ${totalBlocks} blocks across ${content.sections.length} sections.`)
  console.log(`Artifacts: student-view=${studentViewCaptured}, pdf=${pdfExportSucceeded}`)

  await context.close()
})
