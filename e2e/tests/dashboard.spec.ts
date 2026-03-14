import { test, expect } from '@playwright/test'
import { createAuthenticatedContext } from '../helpers/auth-helper'

test('dashboard tiles navigate to correct routes', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })

  // Students tile -> /students
  await page.locator('a[href="/students"]').filter({ hasText: 'View all students' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 10000 })

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  // Lessons tile -> /lessons
  await page.getByTestId('lessons-tile').click()
  await expect(page).toHaveURL('/lessons', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  // Active plans tile -> /lessons?status=Published
  await page.getByTestId('active-plans-tile').click()
  await expect(page).toHaveURL('/lessons?status=Published', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })

  await context.close()
})

test('dashboard tiles show real counts', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })

  // Wait for counts to load (no longer showing "—")
  await expect(page.getByTestId('students-count')).not.toHaveText('—', { timeout: 10000 })
  await expect(page.getByTestId('lessons-count')).not.toHaveText('—', { timeout: 10000 })
  await expect(page.getByTestId('active-plans-count')).not.toHaveText('—', { timeout: 10000 })

  // Counts must be numeric
  const studentsText = await page.getByTestId('students-count').textContent()
  const lessonsText = await page.getByTestId('lessons-count').textContent()
  const activePlansText = await page.getByTestId('active-plans-count').textContent()
  expect(Number(studentsText)).not.toBeNaN()
  expect(Number(lessonsText)).not.toBeNaN()
  expect(Number(activePlansText)).not.toBeNaN()

  await context.close()
})

test('sidebar nav links navigate to correct routes', async ({ browser }) => {
  const context = await createAuthenticatedContext(browser)
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })

  const nav = page.locator('nav')

  // Nav -> Students
  await nav.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 10000 })

  // Nav -> Lessons
  await nav.getByRole('link', { name: 'Lessons', exact: true }).click()
  await expect(page).toHaveURL('/lessons', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Lessons', { timeout: 10000 })

  // Nav -> My Profile
  await nav.getByRole('link', { name: 'My Profile', exact: true }).click()
  await expect(page).toHaveURL('/settings', { timeout: 10000 })

  // Nav -> Dashboard
  await nav.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
  await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

  await context.close()
})
