import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let lessonId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  // Fetch the "Daily Routines" lesson (plain, no content block)
  const res = await page.request.get(`${API_BASE}/api/lessons`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const lessons = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  const visual = lessons.find((l: { title?: string; id: string }) => l.title === 'Daily Routines')
  if (!visual) throw new Error('No "Daily Routines" visual-seed lesson found. Run start-visual-stack.sh first.')
  lessonId = visual.id

  await page.close()
  await ctx.close()
})

test('@visual lesson editor', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/lessons/${lessonId}`)
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('domcontentloaded', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/lesson-editor.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
