import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

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
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('/settings')
  await expect(page.locator('h1')).toHaveText('My Profile')

  // Wait for profile to finish loading (input becomes visible)
  await page.waitForSelector('input[name="displayName"]')

  // Fill display name
  await page.fill('input[name="displayName"]', 'Test Teacher')

  // Select teaching languages (idempotent — no-op if already selected)
  await ensureSelected(page, 'English')
  await ensureSelected(page, 'Spanish')

  // Select CEFR levels
  await ensureSelected(page, 'B1')
  await ensureSelected(page, 'B2')

  // Select preferred style
  await ensureSelected(page, 'Conversational')

  // Save
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('save-success')).toBeVisible()

  // Reload and assert persistence (wait for profile API to populate the field)
  await page.reload()
  await expect(page.locator('input[name="displayName"]')).toHaveValue('Test Teacher', { timeout: 10000 })
  await expect(page.locator('button:has-text("English")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("Spanish")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("B1")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("B2")').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button:has-text("Conversational")').first()).toHaveAttribute('aria-pressed', 'true')

  await context.close()
})
