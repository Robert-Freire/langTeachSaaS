import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

// [visual-seed] student -- no sessions (for empty-state screenshot)
let emptyStudentId = ''
// Diego Seed has 2 session logs -- shows last-session block and plannedForToday
let studentWithSessionsId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ personalNotes?: string; name?: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])

  const visual = students.find((s) => s.personalNotes === '[visual-seed]')
  if (!visual) throw new Error('No [visual-seed] student found. Run start-visual-stack.sh first.')
  emptyStudentId = visual.id

  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('No Diego Seed student found. Run start-visual-stack.sh first.')
  studentWithSessionsId = diego.id

  await page.close()
  await ctx.close()
})

test('@visual log session page - empty state (no sessions)', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${emptyStudentId}/log-session`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  // session-number is rendered after the sessions query resolves (shows "Session #1" for empty state)
  await expect(page.getByTestId('session-number')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/log-session-empty.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session page - with previous session context', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}/log-session`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  // session-number appears after sessions load; for Diego Seed this will show "Session #3"
  await expect(page.getByTestId('session-number')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/log-session-with-context.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session page - cancelled toggle', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${emptyStudentId}/log-session`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('session-number')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('cancelled-toggle').click()
  await expect(page.getByTestId('actual-content')).not.toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/log-session-cancelled.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
