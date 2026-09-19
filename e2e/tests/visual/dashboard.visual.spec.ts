import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADERS = { Authorization: 'Bearer test-token' }

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('@visual dashboard', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Deterministically seed a student followup immediately followed by a
  // general note (the pending-followups seed data has no Operational-kind
  // student followup by default), so the GENERAL-chip / grouping-key
  // rendering can be asserted: a general note right after a student
  // followup must get its own GENERAL chip, not appear unlabeled under the
  // preceding student's chip.
  const studentsRes = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADERS })
  expect(studentsRes.ok()).toBeTruthy()
  const { items: students } = await studentsRes.json()
  const studentId = students[0].id

  const studentFollowupRes = await page.request.post(`${API_BASE}/api/teacher-followups`, {
    headers: AUTH_HEADERS,
    data: { text: 'Visual spec: student followup before a general note', studentId },
  })
  expect(studentFollowupRes.ok()).toBeTruthy()
  const studentFollowup = await studentFollowupRes.json()

  const generalNoteRes = await page.request.post(`${API_BASE}/api/teacher-followups`, {
    headers: AUTH_HEADERS,
    data: { text: 'Visual spec: general note after a student followup' },
  })
  expect(generalNoteRes.ok()).toBeTruthy()
  const generalNote = await generalNoteRes.json()

  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })

  // Pending Followups card includes the general-note add row, and at least
  // one seeded followup (no studentId/groupId) renders without a student chip.
  const followupsCard = page.getByTestId('zone2-pending-followups')
  await expect(followupsCard.getByTestId('general-note-input')).toBeVisible()
  const followupRowCount = await followupsCard.locator('[data-testid^="followup-dot-"]').count()
  const chipCount = await followupsCard.locator('[data-testid^="followup-student-link-"]').count()
  expect(chipCount).toBeLessThan(followupRowCount)

  // The specific seeded student followup and the general note right after it
  // must each render their own chip: the student's, and a GENERAL chip for
  // the note rather than it appearing unlabeled under that student.
  await expect(followupsCard.getByTestId(`followup-student-link-${studentFollowup.id}`)).toBeVisible()
  await expect(followupsCard.getByTestId(`followup-general-chip-${generalNote.id}`)).toBeVisible()

  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
