import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { resetE2ETestTeacher } from '../helpers/db-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'

// This test needs a fresh teacher (no onboarding completed).
// Reset the teacher before running, then re-create via /api/auth/me
// but do NOT call approveE2ETestTeacher (which sets HasCompletedOnboarding=1).
test.describe.serial('Onboarding wizard', () => {
  test.beforeAll(async () => {
    await resetE2ETestTeacher()
  })

  // After tests, restore the standard e2e teacher state for other test files.
  test.afterAll(async ({ browser }) => {
    const ctx = await createMockAuthContext(browser)
    const page = await ctx.newPage()
    await setupMockTeacher(page)
    await page.close()
    await ctx.close()
  })

  test('new user completes onboarding wizard', async ({ browser }) => {
    const context = await createMockAuthContext(browser)
    const page = await context.newPage()
    const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

    // Register the teacher via API (creates teacher with HasCompletedOnboarding=false)
    const meResponse = await page.request.get(`${apiBase}/api/auth/me`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(meResponse.ok()).toBeTruthy()

    // Approve the teacher (but NOT complete onboarding)
    const pool = (await import('mssql')).default
    const config = {
      server: process.env.DB_SERVER ?? '127.0.0.1',
      port: parseInt(process.env.DB_PORT ?? '1434'),
      database: process.env.DB_NAME ?? 'LangTeach',
      user: process.env.DB_USER ?? 'sa',
      password: process.env.DB_PASSWORD ?? 'LangTeach_Dev1!',
      options: { trustServerCertificate: true },
    }
    const conn = await new pool.ConnectionPool(config).connect()
    await conn.request().query(
      "UPDATE Teachers SET IsApproved = 1 WHERE Email = 'e2e-test@langteach.io'"
    )
    await conn.close()

    // Navigate to the app, should redirect to /onboarding
    await page.goto('/')
    await page.waitForURL('**/onboarding', { timeout: NAV_TIMEOUT })

    // Step 1: Profile setup
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Set up your profile')).toBeVisible()

    // Fill name
    const nameInput = page.getByTestId('onboarding-display-name')
    await nameInput.clear()
    await nameInput.fill('E2E Onboarding Teacher')

    // Select a teaching language
    await page.locator('button:has-text("English")').first().click()

    // Select a CEFR level
    await page.locator('button:has-text("B1")').first().click()

    // Click Next
    await page.getByTestId('onboarding-next').click()

    // Step 2: First student
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Add your first student')).toBeVisible()

    // Fill student name
    await page.getByTestId('onboarding-student-name').fill('Test Student')

    // Select learning language
    await page.getByTestId('onboarding-learning-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    // Select CEFR level
    await page.getByTestId('onboarding-cefr-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    // Click Next
    await page.getByTestId('onboarding-next').click()

    // Step 3: First lesson
    await expect(page.getByTestId('onboarding-step-3')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Create your first lesson')).toBeVisible()

    // Fill lesson details
    await page.getByTestId('onboarding-lesson-title').fill('Past Tenses Review')
    await page.getByTestId('onboarding-lesson-topic').fill('Travel stories')

    // Click Finish
    await page.getByTestId('onboarding-next').click()

    // Should redirect to the lesson editor
    await page.waitForURL('**/lessons/**', { timeout: NAV_TIMEOUT })
    expect(page.url()).toContain('/lessons/')

    // Refresh and verify we land on dashboard (not onboarding)
    await page.goto('/')
    await page.waitForURL('**/', { timeout: NAV_TIMEOUT })
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: UI_TIMEOUT })

    await page.close()
    await context.close()
  })
})
