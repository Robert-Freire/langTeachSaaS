import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('teacher can save and reload profile settings', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('http://localhost:5173/settings')
  await expect(page.locator('h1')).toHaveText('My Profile')

  // Fill display name
  await page.fill('input[name="displayName"]', 'Test Teacher')

  // Select teaching languages
  await page.check('input[value="English"]')
  await page.check('input[value="Spanish"]')

  // Select CEFR levels
  await page.check('input[value="B1"]')
  await page.check('input[value="B2"]')

  // Select preferred style
  await page.check('input[value="Conversational"]')

  // Save
  await page.click('button[type="submit"]')
  await expect(page.locator('.save-success')).toBeVisible()

  // Reload and assert persistence
  await page.reload()
  await expect(page.locator('input[name="displayName"]')).toHaveValue('Test Teacher')
  await expect(page.locator('input[value="English"]')).toBeChecked()
  await expect(page.locator('input[value="Spanish"]')).toBeChecked()
  await expect(page.locator('input[value="B1"]')).toBeChecked()
  await expect(page.locator('input[value="B2"]')).toBeChecked()
  await expect(page.locator('input[value="Conversational"]')).toBeChecked()

  await context.close()
})
