import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'
import { getTestAuth0UserId, updateTeacherAuth0Id } from '../helpers/db-helper'

test('provider switch preserves teacher identity', async ({ browser }) => {
  const email = process.env.E2E_TEST_EMAIL!
  const auth0UserId = getTestAuth0UserId()

  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

  // Capture the bearer token from the profile request (same pattern as auth-me.spec.ts)
  let bearerToken = ''
  const profileResponse = page.waitForResponse(
    r => r.url() === `${apiBase}/api/profile` && r.request().method() === 'GET'
  )
  page.on('request', req => {
    if (req.url() === `${apiBase}/api/profile` && req.method() === 'GET') {
      bearerToken = req.headers()['authorization']?.replace('Bearer ', '') ?? ''
    }
  })

  await page.goto('/settings')
  await profileResponse
  expect(bearerToken).toBeTruthy()

  // Simulate a previous login with a different provider by changing Auth0UserId in the DB
  await updateTeacherAuth0Id(email, 'old-provider|simulated-switch')

  // Call /api/auth/me with the real token (email matches, but Auth0UserId now differs)
  // The system should find the teacher by email and update Auth0UserId
  const meResponse = await context.request.get(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  expect(meResponse.status()).toBe(200)
  const me = await meResponse.json()

  // Sub should reflect the current token's sub (provider switch updated Auth0UserId)
  expect(me.sub).toBe(auth0UserId)

  await context.close()
})
