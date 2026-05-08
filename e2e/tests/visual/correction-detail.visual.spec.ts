import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }
const SEEDED_CORRECTION_ID = 'c0117e57-1155-4ada-ada0-c0177e1c7ec1'

let studentId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  const ana = students.find((s: { name?: string; id: string }) => s.name === 'Ana Visual')
  if (!ana) throw new Error('No "Ana Visual" student found. Run start-visual-stack.sh first.')
  studentId = ana.id

  await page.close()
  await ctx.close()
})

test('@visual correction detail (Corregida)', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}/corrections/${SEEDED_CORRECTION_ID}`)
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('marked-up-text')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.waitForLoadState('domcontentloaded', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/correction-detail.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
