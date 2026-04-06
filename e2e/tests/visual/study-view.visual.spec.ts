import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

// The visual seed marks the lesson with content using Title = "Travel Vocabulary"
let lessonId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/lessons`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const lessons = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  // Title is "Travel Vocabulary" for the lesson with content block
  const visual = lessons.find((l: { title?: string; id: string }) => l.title === 'Travel Vocabulary')
  if (!visual) throw new Error('No "Travel Vocabulary" lesson found. Run start-visual-stack.sh first.')
  lessonId = visual.id

  await page.close()
  await ctx.close()
})

test('@visual study view', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/lessons/${lessonId}/study`)
  await page.waitForLoadState('domcontentloaded', { timeout: UI_TIMEOUT })
  await expect(page.locator('[data-testid="study-title"]')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.screenshot({ path: 'screenshots/study-view.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
