import { test, expect } from '@playwright/test'

test('GET /api/health returns 200 without token', async ({ request }) => {
  const response = await request.get('http://localhost:5000/api/health')
  expect(response.status()).toBe(200)
})

test('GET /api/auth/me returns 401 without token', async ({ request }) => {
  const response = await request.get('http://localhost:5000/api/auth/me')
  expect(response.status()).toBe(401)
})

test('frontend redirects unauthenticated user to Auth0 login page', async ({ page }) => {
  await page.context().clearCookies()
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }).catch(() => {})

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/auth0\.com/, { timeout: 10000 })

  await expect(page).toHaveURL(/langteach-dev\.eu\.auth0\.com/)
  await expect(page.locator('body')).toContainText('Log in to langteach-dev')
})

test('Auth0 login page shows email/password and Google options', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/auth0\.com/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  await expect(page.locator('input[id="username"], input[autocomplete="username email"]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('text=Continue with Google')).toBeVisible()
})
