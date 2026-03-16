import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

// Ensure a badge button is in the selected (aria-pressed="true") state.
// If it's already selected, this is a no-op. If not, clicks to select it.
async function ensureSelected(page: import('@playwright/test').Page, text: string) {
  const btn = page.locator(`button:has-text("${text}")`).first()
  const pressed = await btn.getAttribute('aria-pressed')
  if (pressed !== 'true') {
    await btn.click()
  }
}

test('teacher can save and reload profile settings', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

  await page.goto('/settings')
  await expect(page.locator('h1')).toHaveText('My Profile')

  // Wait for profile to finish loading AND populating the form.
  // The input only appears after isLoading=false, but a React Query background
  // refetch can trigger the useEffect([profile]) again, overwriting user input.
  // Wait for the input to have a non-empty value to ensure all effects have settled.
  const nameInput = page.locator('input[name="displayName"]')
  await expect(nameInput).not.toHaveValue('', { timeout: UI_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

  // Fill display name
  await page.fill('input[name="displayName"]', 'Test Teacher')

  // Select teaching languages (idempotent)
  await ensureSelected(page, 'English')
  await ensureSelected(page, 'Spanish')

  // Select CEFR levels
  await ensureSelected(page, 'B1')
  await ensureSelected(page, 'B2')

  // Select preferred style
  await ensureSelected(page, 'Conversational')

  // Save: intercept the PUT response to confirm the server roundtrip completed
  const saveResponse = page.waitForResponse(
    r => r.url() === `${apiBase}/api/profile` && r.request().method() === 'PUT'
  )
  await page.click('button[type="submit"]')
  const putResponse = await saveResponse
  expect(putResponse.status()).toBe(200)

  const saved = await putResponse.json()
  expect(saved.displayName).toBe('Test Teacher')

  // Reload and assert persistence (wait for profile API to populate the field)
  await page.reload()
  await expect(page.locator('input[name="displayName"]')).toHaveValue('Test Teacher', { timeout: UI_TIMEOUT })
  await expect(page.locator('button:has-text("English")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("Spanish")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("B1")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("B2")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("Conversational")').first()).toHaveAttribute('aria-pressed', 'true')

  await context.close()
})
