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

  // Create a group with a student member for the visual review
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

test('@visual groups edit', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/groups/${groupId}/edit`)
  await expect(page.getByTestId('group-name-input')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('member-chips')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/groups-edit.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
