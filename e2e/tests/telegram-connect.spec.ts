import { test, expect, Browser } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'

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
  expect(statusAfterRes.ok()).toBeTruthy()
  const statusAfter = await statusAfterRes.json()
  expect(statusAfter.connected).toBe(false)

  await context.close()
})

// ---- UI tests ----

async function seedConnectedState(browser: Browser): Promise<{ context: Awaited<ReturnType<typeof createMockAuthContext>>; chatId: number }> {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const codeRes = await page.request.post(`${API_BASE}/api/telegram/connect-code`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  if (!codeRes.ok()) throw new Error(`seedConnectedState: connect-code returned ${codeRes.status()}`)
  const { code } = await codeRes.json()

  // Use a deterministic test-namespaced chatId to avoid accumulating junk on the persistent test DB
  const chatId = 9_000_000_000 + Math.floor(Math.random() * 1_000)
  const webhookRes = await page.request.post(`${API_BASE}/api/telegram/webhook`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
    },
    data: {
      update_id: 2,
      message: {
        message_id: 2,
        chat: { id: chatId },
        text: `/connect ${code}`,
      },
    },
  })
  if (!webhookRes.ok()) throw new Error(`seedConnectedState: webhook returned ${webhookRes.status()}`)

  await page.close()
  return { context, chatId }
}

test('settings page shows integrations section with Connect Telegram button', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/settings')
  await expect(page.getByText('Integrations')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('telegram-connect-btn')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('clicking Connect Telegram shows code and instructions', async ({ browser }) => {
  // Ensure not connected first
  const setupCtx = await createMockAuthContext(browser)
  const setupPage = await setupCtx.newPage()
  await setupPage.request.delete(`${API_BASE}/api/telegram/link`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  await setupPage.close()
  await setupCtx.close()

  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/settings')
  await page.getByTestId('telegram-connect-btn').click()

  await expect(page.getByTestId('telegram-code')).toBeVisible({ timeout: UI_TIMEOUT })
  const botHandle = process.env.VITE_TELEGRAM_BOT_HANDLE ?? '@LangTeachBot'
  await expect(page.getByText(new RegExp(botHandle.replace('@', '\\@')))).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('settings page shows Connected state and disconnect button when linked', async ({ browser }) => {
  const { context } = await seedConnectedState(browser)
  const page = await context.newPage()

  await page.goto('/settings')
  await expect(page.getByTestId('telegram-connected')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByText(/Connected/)).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('telegram-disconnect-btn')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('clicking Disconnect returns settings page to idle state', async ({ browser }) => {
  const { context } = await seedConnectedState(browser)
  const page = await context.newPage()

  await page.goto('/settings')
  await page.getByTestId('telegram-disconnect-btn').click({ timeout: NAV_TIMEOUT })

  await expect(page.getByTestId('telegram-idle')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('telegram-connect-btn')).toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})
