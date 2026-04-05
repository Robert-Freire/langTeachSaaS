import { Page } from '@playwright/test'
import { approveE2ETestTeacher } from './db-helper'

/**
 * Ensures the mock e2e teacher exists and is approved in the DB.
 * Call once in beforeAll after createMockAuthContext.
 */
export async function setupMockTeacher(page: Page): Promise<void> {
  // Hit /api/auth/me to auto-register the fixed identity from E2ETestAuthHandler
  const apiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
  const response = await page.request.get(`${apiBase}/api/auth/me`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  if (!response.ok()) {
    throw new Error(`setupMockTeacher: /api/auth/me returned ${response.status()}`)
  }
  await approveE2ETestTeacher()
}
