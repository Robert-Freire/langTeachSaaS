import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('@visual atelier-999 dashboard', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/dashboard.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual atelier-999 student-roster', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/students')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/student-roster.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual atelier-999 student-overview', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/students')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  const anaLink = page.getByText('Ana Visual').first()
  await anaLink.click()
  await expect(page.locator('[data-testid="student-detail-name"]')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/student-overview.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual atelier-999 sessions', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/sessions')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/sessions.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual atelier-999 lessons', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto('/lessons')
  await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/lessons.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
