import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let diegoId = ''
let claraSeedId = ''

test.beforeAll(async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })

  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  const diego = students.find((s: { name?: string; id: string }) => s.name === 'Diego Seed')
  if (!diego) throw new Error('Diego Seed not found. Run start-visual-stack.sh first.')
  diegoId = diego.id

  const clara = students.find((s: { name?: string; id: string }) => s.name === 'Clara Seed')
  if (!clara) throw new Error('Clara Seed not found. Run start-visual-stack.sh first.')
  claraSeedId = clara.id

  await page.close()
  await ctx.close()
})

test('@visual session history tab - collapsed entries', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${diegoId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('session-entry').first()).toBeVisible()

  await page.screenshot({ path: 'screenshots/session-history-collapsed.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual session history tab - expanded entry (no duplication)', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${diegoId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

  // Expand the first (most recent) session entry
  const firstEntry = page.getByTestId('session-entry').first()
  await firstEntry.getByTestId('session-entry-toggle').click()
  await expect(firstEntry.getByTestId('session-entry-detail')).toBeVisible()

  // Verify no duplication: preview "Planned:" / "Done:" labels must be hidden when expanded
  await expect(firstEntry.getByText(/^Planned:/)).toHaveCount(0)
  await expect(firstEntry.getByText(/^Done:/)).toHaveCount(0)

  await page.screenshot({ path: 'screenshots/session-history-expanded.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session page - create mode with prior topics', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Diego Seed has sessions with NextSessionTopics — reference panel should appear
  await page.goto(`/students/${diegoId}/log-session`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('actual-content')).toBeVisible({ timeout: UI_TIMEOUT })

  await page.screenshot({ path: 'screenshots/session-log-create-with-topics.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session page - create mode no prior sessions', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Clara Seed has no sessions
  await page.goto(`/students/${claraSeedId}/log-session`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('actual-content')).toBeVisible({ timeout: UI_TIMEOUT })

  await page.screenshot({ path: 'screenshots/session-log-create-no-topics.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session page - edit mode pre-populated', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Fetch Diego's sessions to get a real session ID
  const res = await page.request.get(`${API_BASE}/api/students/${diegoId}/sessions`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const sessions = await res.json() as { id: string; isCancelled: boolean }[]
  const firstSession = sessions.find(s => !s.isCancelled)
  if (!firstSession) throw new Error('Diego Seed has no non-cancelled sessions')

  await page.goto(`/students/${diegoId}/sessions/${firstSession.id}/edit`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

  // Edit mode heading
  await expect(page.getByTestId('page-heading')).toHaveText('Edit Session', { timeout: UI_TIMEOUT })

  // Date field should be pre-populated
  const dateInput = page.getByTestId('session-date')
  await expect(dateInput).toBeVisible()
  const dateValue = await dateInput.inputValue()
  expect(dateValue).not.toBe('')

  await page.screenshot({ path: 'screenshots/session-log-edit-mode.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
