import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'
import { deleteTeacherByAuth0Id } from '../helpers/db-helper'

/**
 * Registration happy path:
 * A user logs in for the first time → the app creates their teacher record
 * automatically with email populated.
 *
 * Simulated by deleting the teacher record before the second login so the DB
 * is in the same state as a genuine first-time login.
 */
test('first login creates teacher record with email', async ({ browser }) => {
  const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

  // ── Step 1: log in and capture Auth0 sub + bearer token ──────────────────
  const setupContext = await createAuthenticatedContext(browser)
  const setupPage    = await setupContext.newPage()

  let bearerToken = ''
  setupPage.on('request', req => {
    if (req.url() === `${apiBase}/api/profile` && req.method() === 'GET') {
      bearerToken = req.headers()['authorization']?.replace('Bearer ', '') ?? ''
    }
  })

  const profilePromise = setupPage.waitForResponse(
    r => r.url() === `${apiBase}/api/profile` && r.request().method() === 'GET'
  )
  await setupPage.goto('/settings')
  await profilePromise

  expect(bearerToken).toBeTruthy()

  const meRes = await setupContext.request.get(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  expect(meRes.status()).toBe(200)
  const { sub } = await meRes.json() as { sub: string }
  expect(sub).toBeTruthy()

  await setupContext.close()

  // ── Step 2: delete teacher record — simulates first-time login ────────────
  await deleteTeacherByAuth0Id(sub)

  // ── Step 3: log in again (no teacher record in DB) ────────────────────────
  const context = await createAuthenticatedContext(browser)
  const page    = await context.newPage()

  let capturedToken = ''
  page.on('request', req => {
    if (req.url() === `${apiBase}/api/profile` && req.method() === 'GET') {
      capturedToken = req.headers()['authorization']?.replace('Bearer ', '') ?? ''
    }
  })

  const registrationProfilePromise = page.waitForResponse(
    r => r.url() === `${apiBase}/api/profile` && r.request().method() === 'GET'
  )
  await page.goto('/settings')
  const response = await registrationProfilePromise

  // ── Step 4: assert teacher record was created ─────────────────────────────
  expect(response.status()).toBe(200)
  const profile = await response.json() as { id: string }
  expect(profile.id).toBeTruthy()

  // ── Step 5: assert email was populated via /userinfo ─────────────────────
  expect(capturedToken).toBeTruthy()
  const meResponse = await context.request.get(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${capturedToken}` },
  })
  expect(meResponse.status()).toBe(200)
  const me = await meResponse.json() as { sub: string; email: string }
  expect(me.sub).toBe(sub)
  expect(me.email).toBeTruthy()
  expect(me.email).toContain('@')

  await context.close()
})
