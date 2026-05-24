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

  // Seed a group with a member so the left-rail identity + members disclosure render
  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: { name: 'Visual Student', learningLanguage: 'Spanish', cefrLevel: 'B1', interests: [], learningGoals: [], weaknesses: [], difficulties: [] },
  })
  const student = await studentRes.json()

  const groupRes = await page.request.post(`${API_BASE}/api/groups`, {
    headers: AUTH_HEADER,
    data: { name: 'Visual Review Group', cefrLevel: 'B1', description: 'A sample group for visual review.', isActive: true },
  })
  const group = await groupRes.json()
  groupId = group.id

  await page.request.post(`${API_BASE}/api/groups/${groupId}/members`, {
    headers: AUTH_HEADER,
    data: { studentId: student.id },
  })

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

  // Group variant suppresses the editable Previous-Homework tri-state toggle:
  // it surfaces as a read-only marker, never the interactive control.
  await expect(page.getByTestId('prev-homework-readonly')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-log-session.png', fullPage: true })

  // Expand the members disclosure in the group-identity rail
  await page.getByTestId('members-disclosure-toggle').click()
  await expect(page.getByTestId('members-disclosure-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-log-session-members.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
