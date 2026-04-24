import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../../helpers/auth-helper'
import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../../helpers/timeouts'
import * as fs from 'fs'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
const AUTH_HEADER = { Authorization: 'Bearer test-token' }

let studentId = ''
let studentWithSessionsId = ''

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ profile?: { personalNotes?: string }; name?: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])

  // [visual-seed] student -- no sessions (for empty-state screenshot)
  const visual = students.find((s) => s.profile?.personalNotes === '[visual-seed]')
  if (!visual) throw new Error('No [visual-seed] student found. Run start-visual-stack.sh first.')
  studentId = visual.id

  // Diego Seed is the scenario student seeded with 2 session logs
  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('No Diego Seed student found. Run start-visual-stack.sh first.')
  studentWithSessionsId = diego.id

  await page.close()
  await ctx.close()
})

test('@visual student detail page', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual log session button navigates to full page', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('log-session-button').click()
  await expect(page).toHaveURL(/\/students\/[^/]+\/log-session$/, { timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/log-session-navigation.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail sessions tab - with sessions', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail-sessions-tab.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail profile tab - right sidebar visible', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('profile-about')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail-profile-tab.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail sessions tab - expanded row with editable fields', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('session-entry-toggle').first().click()
  await expect(page.getByTestId('session-entry-detail').first()).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('session-title-input').first()).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail-session-expanded.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual header stable - overview tab 1280px', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })

  await expect(page.getByTestId('student-detail-name')).toBeVisible()
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('student-header-subtitle')).toBeVisible()
  await expect(page.getByTestId('student-status-badge')).toBeVisible()
  await page.screenshot({ path: 'screenshots/header-stable-overview.png', fullPage: false })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual header stable - profile tab 1280px', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

  await expect(page.getByTestId('student-detail-name')).toBeVisible()
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('student-header-subtitle')).toBeVisible()
  await expect(page.getByTestId('student-status-badge')).toBeVisible()
  await page.screenshot({ path: 'screenshots/header-stable-profile-1280.png', fullPage: false })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual header stable - progress tab 1280px', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-progress').click()
  await expect(page.getByTestId('progress-tab-content')).toBeVisible({ timeout: UI_TIMEOUT })

  await expect(page.getByTestId('student-detail-name')).toBeVisible()
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('student-header-subtitle')).toBeVisible()
  await expect(page.getByTestId('student-status-badge')).toBeVisible()
  await page.screenshot({ path: 'screenshots/header-stable-progress.png', fullPage: false })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual header stable - sessions tab 1280px', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

  await expect(page.getByTestId('student-detail-name')).toBeVisible()
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('student-header-subtitle')).toBeVisible()
  await expect(page.getByTestId('student-status-badge')).toBeVisible()
  await page.screenshot({ path: 'screenshots/header-stable-sessions.png', fullPage: false })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual header stable - profile tab 375px', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  await page.setViewportSize({ width: 375, height: 812 })
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

  await expect(page.getByTestId('student-detail-name')).toBeVisible()
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('student-header-subtitle')).toBeVisible()
  await expect(page.getByTestId('student-status-badge')).toBeVisible()
  await page.screenshot({ path: 'screenshots/header-stable-profile-375.png', fullPage: false })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail progress tab - skill bars', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-progress').click()
  await expect(page.getByTestId('progress-tab-content')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('skill-bar-reading')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/progress-dashboard.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})

test('@visual student detail overview tab - with sessions', async ({ browser }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  await page.goto(`/students/${studentWithSessionsId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('recent-sessions')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.screenshot({ path: 'screenshots/student-detail-overview-sessions.png', fullPage: true })

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  await context.close()
})
