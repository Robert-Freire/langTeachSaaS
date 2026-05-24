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

  // Seed a group with a member so the detail tabs have content to render
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

test('@visual group detail tabs', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/groups/${groupId}`)
  await expect(page.getByTestId('group-detail-page')).toBeVisible({ timeout: NAV_TIMEOUT })

  // Overview tab (default): hero spine + group-scoped Teacher's Working Memory card
  await expect(page.getByTestId('tab-overview')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-detail-overview.png', fullPage: true })

  // Members tab: roster of seeded member
  await page.getByTestId('tab-members').click()
  await expect(page.getByTestId('tab-members')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-detail-members.png', fullPage: true })

  // Sessions tab: group session history
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('tab-sessions')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/group-detail-sessions.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
