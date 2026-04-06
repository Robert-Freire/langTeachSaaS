import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('telegram connect-code returns code and future expiry', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const res = await page.request.post(`${API_BASE}/api/telegram/connect-code`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(res.ok()).toBeTruthy()

  const body = await res.json()
  expect(typeof body.code).toBe('string')
  expect(body.code.length).toBeGreaterThan(0)
  expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now())

  await context.close()
})

test('telegram status returns not connected initially', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const res = await page.request.get(`${API_BASE}/api/telegram/status`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(res.ok()).toBeTruthy()

  const body = await res.json()
  expect(body.connected).toBe(false)
  expect(body.linkedAt).toBeNull()

  await context.close()
})

test('telegram delete link returns 404 when no link exists', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const res = await page.request.delete(`${API_BASE}/api/telegram/link`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(res.status()).toBe(404)

  await context.close()
})

test('telegram connect flow: webhook connect sets status to connected, delete removes link', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Generate connect code
  const codeRes = await page.request.post(`${API_BASE}/api/telegram/connect-code`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(codeRes.ok()).toBeTruthy()
  const { code } = await codeRes.json()

  // Simulate Telegram bot sending /connect <code> via webhook
  const fakeChatId = Math.floor(Math.random() * 1_000_000) + 100_000
  const webhookRes = await page.request.post(`${API_BASE}/api/telegram/webhook`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
    },
    data: {
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: fakeChatId },
        text: `/connect ${code}`,
      },
    },
  })
  expect(webhookRes.ok()).toBeTruthy()

  // Status should now show connected
  const statusRes = await page.request.get(`${API_BASE}/api/telegram/status`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(statusRes.ok()).toBeTruthy()
  const status = await statusRes.json()
  expect(status.connected).toBe(true)
  expect(status.linkedAt).not.toBeNull()

  // Delete link
  const deleteRes = await page.request.delete(`${API_BASE}/api/telegram/link`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(deleteRes.status()).toBe(204)

  // Confirm disconnected
  const statusAfterRes = await page.request.get(`${API_BASE}/api/telegram/status`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const statusAfter = await statusAfterRes.json()
  expect(statusAfter.connected).toBe(false)

  await context.close()
})
