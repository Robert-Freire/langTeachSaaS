import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { createStudentViaApi } from '../helpers/students'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

/**
 * Regression test for #1299: detail page shows blank when arriving at a
 * Corrigiendo correction outside the local mutation flow (refresh, back/forward,
 * direct link). The Corrigiendo spinner must render based on server status,
 * not only on the local viewState set by onMutate.
 */
test('detail page shows Corrigiendo spinner after F5 refresh (server-driven state)', async ({ browser }) => {
  // Setup
  const setupCtx = await createMockAuthContext(browser)
  const setupPage = await setupCtx.newPage()

  const student = await createStudentViaApi(setupPage, {
    name: `Corrigiendo Refresh ${Date.now()}`,
    cefrLevel: 'A1',
  })

  const correctionRes = await setupPage.request.post(
    `${API_BASE}/api/students/${student.id}/corrections`,
    {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: {
        assignmentTitle: 'Redacción de prueba',
        studentText: 'Ayer yo voy al mercado y compro muchas cosas.',
      },
    },
  )
  expect(correctionRes.ok()).toBeTruthy()
  const correction = await correctionRes.json() as { id: string }

  await setupPage.close()
  await setupCtx.close()

  // Test: navigate to the correction detail page with the API mocked to Corrigiendo
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()

  const correctionUrl = `**/api/students/${student.id}/corrections/${correction.id}`

  const corrigendoResponse = {
    id: correction.id,
    studentId: student.id,
    schemaVersion: 1,
    status: 'Corrigiendo',
    assignmentTitle: 'Redacción de prueba',
    assignmentPrompt: null,
    studentText: 'Ayer yo voy al mercado y compro muchas cosas.',
    markedUpOutput: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    correctedAt: null,
  }

  await page.route(correctionUrl, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corrigendoResponse) })
  )

  await page.goto(`/students/${student.id}/redacciones/${correction.id}`)

  // Spinner visible on first load
  await expect(page.getByRole('button', { name: /Corrigiendo/ })).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByRole('button', { name: /Corrigiendo/ })).toBeDisabled()

  // Reload (F5 — the bug scenario)
  await page.reload()

  // Spinner must still be visible after reload (this failed before the fix)
  await expect(page.getByRole('button', { name: /Corrigiendo/ })).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByRole('button', { name: /Corrigiendo/ })).toBeDisabled()

  // Student text must be visible (ReadingColumn rendered)
  await expect(page.getByText('Ayer yo voy al mercado')).toBeVisible({ timeout: UI_TIMEOUT })

  await ctx.close()
})
