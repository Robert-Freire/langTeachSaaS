import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT, NAV_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('dashboard renders with seeded data', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Zone 1: either next session hero or empty state
    const zone1 = page.locator('[data-testid="zone1-next-session"], [data-testid="zone1-empty"]')
    await expect(zone1.first()).toBeVisible({ timeout: UI_TIMEOUT })

    // Zone 2: both agenda and followups present
    await expect(page.getByTestId('zone2-today-agenda')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('zone2-pending-followups')).toBeVisible({ timeout: UI_TIMEOUT })

    // Zone 3: student roster present
    await expect(page.getByTestId('zone3-student-roster')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('dashboard zone3 roster shows student count and sort control', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('zone3-student-roster')).toBeVisible({ timeout: UI_TIMEOUT })

    const rosterRows = page.getByTestId('zone3-student-row')
    const rowCount = await rosterRows.count()
    if (rowCount > 0) {
      // Sort control should be present when students exist
      await expect(page.getByTestId('roster-sort')).toBeVisible({ timeout: UI_TIMEOUT })
      // Student count label should be present
      await expect(page.getByTestId('student-count')).toBeVisible({ timeout: UI_TIMEOUT })
    }
  } finally {
    await context.close()
  }
})

test('start session button navigates to log-session when next session is shown', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    const heroPresent = await page.getByTestId('zone1-next-session').isVisible()
    if (!heroPresent) {
      // No next session seeded — skip assertion
      return
    }

    const startBtn = page.getByTestId('start-session-btn')
    await expect(startBtn).toBeVisible({ timeout: UI_TIMEOUT })
    await startBtn.click()
    await expect(page).toHaveURL(/\/students\/[0-9a-f-]+\/log-session/, { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('clicking student in roster navigates to student detail', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    const firstRow = page.getByTestId('zone3-student-row').first()
    await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT })

    const studentLink = firstRow.locator('a').first()
    await studentLink.click()

    await expect(page).toHaveURL(/\/students\/[0-9a-f-]+/, { timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sidebar nav links navigate to correct routes', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

  const nav = page.locator('nav')

  // Nav -> Students
  await nav.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: UI_TIMEOUT })

  // Nav -> Courses
  await nav.getByRole('link', { name: 'Courses', exact: true }).click()
  await expect(page).toHaveURL('/courses', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Courses', { timeout: UI_TIMEOUT })

  // Nav -> Lessons
  await nav.getByRole('link', { name: 'Lessons', exact: true }).click()
  await expect(page).toHaveURL('/lessons', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: UI_TIMEOUT })

  // Nav -> Settings
  await nav.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL('/settings', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Settings', { timeout: UI_TIMEOUT })

  // Nav -> Dashboard
  await nav.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page).toHaveURL('/', { timeout: UI_TIMEOUT })
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: UI_TIMEOUT })

  await context.close()
})
