import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

// Diego Seed has 2 session logs -- use most recent for edit mode
let sessionId = ''
let studentId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ name?: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])

  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('No Diego Seed student found. Run start-visual-stack.sh first.')
  studentId = diego.id

  const sessionsRes = await page.request.get(`${API_BASE}/api/students/${studentId}/sessions`, { headers: AUTH_HEADER })
  expect(sessionsRes.ok()).toBeTruthy()
  const sessions: Array<{ id: string; sessionDate: string }> = await sessionsRes.json()
  if (!sessions.length) throw new Error('Diego Seed has no sessions. Run start-visual-stack.sh first.')
  // Sort descending by date, take most recent
  sessions.sort((a, b) => {
    const byDate = b.sessionDate.localeCompare(a.sessionDate)
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id)
  })
  sessionId = sessions[0].id

  await page.close()
  await ctx.close()
})

test('@visual edit session page', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}/sessions/${sessionId}/edit`)
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('actual-content')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/session-edit.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
