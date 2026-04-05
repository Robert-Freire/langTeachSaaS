import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let studentId = ''
let studentWithSessionsId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ notes?: string; name?: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])

  // [visual-seed] student -- no sessions (for empty-state screenshot)
  const visual = students.find((s) => s.notes === '[visual-seed]')
  if (!visual) throw new Error('No [visual-seed] student found. Run start-visual-stack.sh first.')
  studentId = visual.id

  // Diego Seed is the scenario student seeded with 2 session logs
  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('No Diego Seed student found. Run start-visual-stack.sh first.')
  studentWithSessionsId = diego.id

  await page.close()
  await ctx.close()
})

test('@visual student detail page', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual session log dialog - initial state', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('session-date')).toBeVisible()
  await page.screenshot({ path: 'screenshots/session-log-dialog.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual session log dialog - reassessment toggle on', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('reassessment-toggle').click()
  await expect(page.getByTestId('reassessment-skill')).toBeVisible()
  await page.screenshot({ path: 'screenshots/session-log-dialog-reassessment.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail overview - with sessions', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('session-summary-header')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail-overview-sessions.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
