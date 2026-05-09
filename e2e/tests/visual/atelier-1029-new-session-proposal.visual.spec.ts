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

test('@visual atelier-1029 new-session-proposal-card', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Navigate to Ana Visual's student overview (rich-profile scenario)
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

  // Type scheduling text that triggers the [schedule-new-session] stub
  const input = page.locator('[data-testid="assistant-input"]')
  await input.fill('Next Monday I want to do a session on the subjunctive. [schedule-new-session]')
  await page.locator('[data-testid="assistant-send-btn"]').click()

  // Wait for proposals to appear, then scroll the newSession card into view
  await expect(page.locator('[data-testid="proposals-list"]')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  // Assert newSession card is present before screenshotting
  const dateInput = page.locator('[data-testid^="session-date-input-"]').first()
  await expect(dateInput).toBeVisible({ timeout: UI_TIMEOUT })
  await dateInput.scrollIntoViewIfNeeded()

  await page.screenshot({ path: 'screenshots/atelier-1029-new-session-proposal-card.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual atelier-1029 new-session-proposal-no-student', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  // Dashboard — no student context
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  // Assert FAB is disabled — product invariant: no student context means the assistant cannot be opened
  const assistantBtn = page.locator('[data-testid="open-assistant-btn"]').first()
  await expect(assistantBtn).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(assistantBtn).toBeDisabled({ timeout: UI_TIMEOUT })

  await page.screenshot({ path: 'screenshots/atelier-1029-new-session-proposal-no-student.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
