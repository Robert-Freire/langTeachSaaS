import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('login creates teacher record with email populated', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

  // Intercept GET /api/profile — this is what triggers UpsertTeacherAsync on login
  let bearerToken = ''
  const profileResponse = page.waitForResponse(
    r => r.url() === `${apiBase}/api/profile` && r.request().method() === 'GET'
  )

  // Also capture the bearer token from the request headers
  page.on('request', req => {
    if (req.url() === `${apiBase}/api/profile` && req.method() === 'GET') {
      bearerToken = req.headers()['authorization']?.replace('Bearer ', '') ?? ''
    }
  })

  await page.goto('/settings')
  const response = await profileResponse

  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body).toMatchObject({
    id: expect.any(String),
    displayName: expect.any(String),
  })

  // Call api/auth/me with the captured bearer token and verify email is returned
  expect(bearerToken).toBeTruthy()
  const meResponse = await context.request.get(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  expect(meResponse.status()).toBe(200)

  const me = await meResponse.json()
  expect(me.sub).toBeTruthy()
  expect(me.email).toBeTruthy()
  expect(me.email).toContain('@')

  await context.close()
})
