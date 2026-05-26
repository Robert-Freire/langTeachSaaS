import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }

let groupId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  // Seed a group with a member so the left-rail identity + members disclosure
  // render. Assert each seed call succeeds; a silent seed failure would
  // otherwise cascade into misleading screenshots.
  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: { name: 'Visual Student', learningLanguage: 'Spanish', cefrLevel: 'B1', interests: [], learningGoals: [], weaknesses: [], difficulties: [] },
  })
  expect(studentRes.ok(), 'student seed failed').toBeTruthy()
  const student = await studentRes.json()

  const groupRes = await page.request.post(`${API_BASE}/api/groups`, {
    headers: AUTH_HEADER,
    data: { name: 'Visual Review Group', cefrLevel: 'B1', description: 'A sample group for visual review.', isActive: true },
  })
  expect(groupRes.ok(), 'group seed failed').toBeTruthy()
  const group = await groupRes.json()
  groupId = group.id

  const memberRes = await page.request.post(`${API_BASE}/api/groups/${groupId}/members`, {
    headers: AUTH_HEADER,
    data: { studentId: student.id },
  })
  expect(memberRes.ok(), 'group-member seed failed').toBeTruthy()

  await page.close()
  await ctx.close()
})

test('@visual group log session form', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/groups/${groupId}/log-session`)
  await expect(page.getByTestId('group-log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('group-log-session-left-panel')).toBeVisible({ timeout: UI_TIMEOUT })

  // The core group requirement: the editable Previous-Homework tri-state toggle
  // (data-testid="prev-homework-status" in the 1-to-1 form) must NEVER appear in the
  // group variant. Homework status is per-student, not a group-level concept. A fresh
  // group with no prior session shows the "first session" rail instead.
  await expect(page.getByTestId('first-session-empty')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('prev-homework-status')).toHaveCount(0)
  await page.screenshot({ path: 'screenshots/group-log-session.png', fullPage: true })

  // Expand the members disclosure in the group-identity rail
  await page.getByTestId('members-disclosure-toggle').click()
  await expect(page.getByTestId('members-disclosure-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-log-session-members.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
