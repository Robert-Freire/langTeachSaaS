import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let diegoId = ''

test.beforeAll(async ({ browser }) => {
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

  await page.close()
  await ctx.close()
})

test('@visual session history tab - collapsed entries', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${diegoId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('session-entry').first()).toBeVisible()

  await page.screenshot({ path: 'screenshots/session-history-collapsed.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual session history tab - expanded entry (no duplication)', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${diegoId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()
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

test('@visual session history tab - edit dialog pre-populated', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${diegoId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByRole('tab', { name: /history/i }).click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

  // Expand the first session entry and open edit dialog
  const firstEntry = page.getByTestId('session-entry').first()
  await firstEntry.getByTestId('session-entry-toggle').click()
  await expect(firstEntry.getByTestId('session-entry-detail')).toBeVisible()
  await firstEntry.getByTestId('edit-session-button').click()

  // Dialog opens in edit mode
  await expect(page.getByTestId('session-log-dialog')).toBeVisible({ timeout: UI_TIMEOUT })

  // Verify pre-populated date and "Save changes" submit label
  const dateInput = page.getByTestId('session-date')
  await expect(dateInput).toBeVisible()
  const dateValue = await dateInput.inputValue()
  expect(dateValue).not.toBe('')

  const submitBtn = page.getByTestId('submit-session-log')
  await expect(submitBtn).toHaveText('Save changes')

  await page.screenshot({ path: 'screenshots/session-history-edit-dialog.png', fullPage: true })
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
