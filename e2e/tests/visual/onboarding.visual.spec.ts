import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { resetE2ETestTeacher, approveE2ETestTeacherWithoutOnboarding, reseedVisualData } from '../../helpers/db-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

// Onboarding requires a teacher with HasCompletedOnboarding = false.
// We reset, register via /api/auth/me, approve without onboarding, then screenshot.
// afterAll restores the standard teacher state so other visual specs still work.
test.describe.serial('@visual onboarding', () => {
  test.beforeAll(async () => {
    await resetE2ETestTeacher()
  })

  test.afterAll(async ({ browser }) => {
    // Re-register and approve the teacher
    const ctx = await createMockAuthContext(browser)
    const page = await ctx.newPage()
    await setupMockTeacher(page)
    await page.close()
    await ctx.close()
    // Restore visual seed data wiped by the cascade delete from resetE2ETestTeacher
    reseedVisualData()
  })

  test('@visual onboarding wizard', async ({ browser }) => {
    fs.mkdirSync('screenshots', { recursive: true })
    const context = await createMockAuthContext(browser)
    const page = await context.newPage()
    const consoleErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

    // Register teacher (creates with HasCompletedOnboarding = false)
    const meRes = await page.request.get(`${API_BASE}/api/auth/me`, { headers: AUTH_HEADER })
    expect(meRes.ok()).toBeTruthy()
    await approveE2ETestTeacherWithoutOnboarding()

    await page.goto('/')
    // App should redirect to /onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('domcontentloaded', { timeout: UI_TIMEOUT })
    await page.screenshot({ path: 'screenshots/onboarding.png', fullPage: true })

    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
    await context.close()
  })
})
