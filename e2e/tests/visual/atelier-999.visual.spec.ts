import { test } from '@playwright/test'
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

  await page.goto('/')
  await page.waitForSelector('h1', { timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/dashboard.png', fullPage: true })

  await context.close()
})

test('@visual atelier-999 student-roster', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students')
  await page.waitForSelector('h1', { timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/student-roster.png', fullPage: true })

  await context.close()
})

test('@visual atelier-999 student-overview', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students')
  await page.waitForSelector('h1', { timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })

  const anaLink = page.getByText('Ana Visual').first()
  await anaLink.click()
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/student-overview.png', fullPage: true })

  await context.close()
})

test('@visual atelier-999 sessions', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/sessions')
  await page.waitForSelector('h1', { timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/sessions.png', fullPage: true })

  await context.close()
})

test('@visual atelier-999 lessons', async ({ browser }) => {
  fs.mkdirSync('screenshots/atelier-999', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/lessons')
  await page.waitForSelector('h1', { timeout: NAV_TIMEOUT })
  await page.waitForLoadState('networkidle', { timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/atelier-999/lessons.png', fullPage: true })

  await context.close()
})
