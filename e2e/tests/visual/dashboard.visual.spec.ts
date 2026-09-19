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
  const { items: students } = await studentsRes.json()
  const studentId = students[0].id
  await page.request.post(`${API_BASE}/api/teacher-followups`, {
    headers: AUTH_HEADERS,
    data: { text: 'Visual spec: student followup before a general note', studentId },
  })
  await page.request.post(`${API_BASE}/api/teacher-followups`, {
    headers: AUTH_HEADERS,
    data: { text: 'Visual spec: general note after a student followup' },
  })

  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })

  // Pending Followups card includes the general-note add row, and at least
  // one seeded followup (no studentId/groupId) renders without a student chip.
  const followupsCard = page.getByTestId('zone2-pending-followups')
  await expect(followupsCard.getByTestId('general-note-input')).toBeVisible()
  const followupRowCount = await followupsCard.locator('[data-testid^="followup-dot-"]').count()
  const chipCount = await followupsCard.locator('[data-testid^="followup-student-link-"]').count()
  expect(chipCount).toBeLessThan(followupRowCount)

  // The general note seeded right after a student followup must render its
  // own GENERAL chip rather than appearing unlabeled under that student.
  await expect(followupsCard.getByText('Visual spec: general note after a student followup')).toBeVisible()
  expect(await followupsCard.locator('[data-testid^="followup-general-chip-"]').count()).toBeGreaterThan(0)

  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
