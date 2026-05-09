import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

// When teacher opens the assistant from a student profile (no session in scope)
// and submits a note that produces session proposals, the panel must show the
// no-session-context banner and disable Apply on session-type cards.
test('@visual atelier-1165 no-session-banner visible on student profile', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Navigate to Ana Visual's student overview (no session in scope)
  await page.goto('/students')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  const anaLink = page.getByText('Ana Visual').first()
  await anaLink.click()
  await expect(page.locator('[data-testid="student-detail-name"]')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  // Open the Atelier Assistant panel
  const assistantBtn = page.locator('[data-testid="open-assistant-btn"]').first()
  await assistantBtn.click()
  await expect(page.locator('[data-testid="assistant-panel"]')).toBeVisible({ timeout: UI_TIMEOUT })

  // Submit a regular session-reflection note (no [schedule-new-session] trigger)
  // The stub will produce session-type proposals (title, actualContent, etc.)
  const input = page.locator('[data-testid="assistant-input"]')
  await input.fill('Hoy trabajamos el pretérito imperfecto con Ana. Hicimos ejercicios de conversación.')
  await page.locator('[data-testid="assistant-send-btn"]').click()

  // Wait for proposals
  await expect(page.locator('[data-testid="proposals-list"]')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  // The no-session banner must be present
  const banner = page.locator('[data-testid="no-session-banner"]')
  await expect(banner).toBeVisible({ timeout: UI_TIMEOUT })

  // At least one session-type Apply button must be disabled
  const sessionApplyBtns = page.locator('[data-testid^="apply-btn-"]')
  const count = await sessionApplyBtns.count()
  expect(count).toBeGreaterThan(0)
  const firstApplyBtn = sessionApplyBtns.first()
  await expect(firstApplyBtn).toBeDisabled()

  await banner.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'screenshots/atelier-1165-no-session-banner.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
