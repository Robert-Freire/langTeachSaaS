import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('STEP1: /groups/new empty name → validation error, no submit', async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  try {
    await page.goto('/groups/new')
    await expect(page.getByTestId('group-name-input')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('group-cefr-select')).toBeVisible()
    await expect(page.getByTestId('group-description-input')).toBeVisible()
    await expect(page.getByTestId('member-search-input')).toBeVisible()

    await page.getByTestId('save-button').click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('alert')).toContainText('required')
    expect(page.url()).toContain('/groups/new')
    await page.screenshot({ path: '/home/rfreire/screenshots/verify-1328-step1.png' })
  } finally { await ctx.close() }
})

test('STEP2: create group Name+CEFR+2members → redirect /groups, shows in list', async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  try {
    await page.goto('/groups/new')
    await expect(page.getByTestId('group-name-input')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('group-name-input').fill('Verify Test Group')

    // Open CEFR select and pick B1
    await page.getByTestId('group-cefr-select').click()
    await expect(page.locator('[role="option"]').filter({ hasText: 'B1' }).first()).toBeVisible({ timeout: 5000 })
    await page.locator('[role="option"]').filter({ hasText: 'B1' }).first().click()

    // Add first member
    await page.getByTestId('member-search-input').fill('a')
    const opts = page.getByTestId(/^student-option-/)
    await expect(opts.first()).toBeVisible({ timeout: 5000 })
    await opts.first().dispatchEvent('mousedown')

    // Add second member
    await page.getByTestId('member-search-input').fill('s')
    const opts2 = page.getByTestId(/^student-option-/)
    await expect(opts2.first()).toBeVisible({ timeout: 5000 })
    await opts2.first().dispatchEvent('mousedown')

    await expect(page.getByTestId('member-chips')).toBeVisible({ timeout: 5000 })

    await page.getByTestId('save-button').click()
    await expect(page).toHaveURL(/\/groups$/, { timeout: 20000 })
    await expect(page.getByText('Verify Test Group').first()).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: '/home/rfreire/screenshots/verify-1328-step2.png' })
  } finally { await ctx.close() }
})

test('STEP3: edit - remove member chip, save, student still in Students list', async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  try {
    await page.goto('/groups')
    const testRow = page.getByText('Verify Test Group').first()
    await expect(testRow).toBeVisible({ timeout: 10000 })
    await testRow.click()
    await expect(page).toHaveURL(/\/groups\/.*\/edit/, { timeout: 10000 })

    const chips = page.getByTestId(/^remove-member-/)
    await expect(chips.first()).toBeVisible({ timeout: 5000 })
    const chipsBefore = await chips.count()
    await chips.first().click()
    await expect(chips).toHaveCount(chipsBefore - 1, { timeout: 5000 })

    await page.getByTestId('save-button').click()
    await expect(page).toHaveURL(/\/groups$/, { timeout: 15000 })

    // Verify student NOT deleted
    await page.goto('/students')
    await expect(page.locator('[data-testid^="student-row-"]').first()).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: '/home/rfreire/screenshots/verify-1328-step3.png' })
  } finally { await ctx.close() }
})

test('STEP4: delete group → /groups with toast, group gone', async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  try {
    await page.goto('/groups')
    const testRow = page.getByText('Verify Test Group').first()
    await expect(testRow).toBeVisible({ timeout: 10000 })
    await testRow.click()
    await expect(page).toHaveURL(/\/groups\/.*\/edit/, { timeout: 10000 })

    await page.getByTestId('delete-group-button').click()
    await expect(page.getByTestId('confirm-delete-button')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('confirm-delete-button').click()

    await expect(page).toHaveURL(/\/groups$/, { timeout: 15000 })
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-sonner-toast]')).toContainText('deleted')

    await expect(page.getByText('Verify Test Group')).not.toBeVisible()
    await page.screenshot({ path: '/home/rfreire/screenshots/verify-1328-step4.png' })
  } finally { await ctx.close() }
})

test('STEP5: Add Group button → /groups/new; Cancel → /groups', async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  try {
    await page.goto('/groups')
    const btn = page.getByTestId('add-group-button')
    await expect(btn).toBeVisible({ timeout: 10000 })
    await expect(btn).not.toBeDisabled()
    await btn.click()
    await expect(page).toHaveURL(/\/groups\/new$/, { timeout: 10000 })

    await page.getByTestId('group-name-input').fill('Should not persist')
    await page.getByTestId('cancel-link').click()
    await expect(page).toHaveURL(/\/groups$/, { timeout: 10000 })
    await expect(page.getByText('Should not persist')).not.toBeVisible()
    await page.screenshot({ path: '/home/rfreire/screenshots/verify-1328-step5.png' })
  } finally { await ctx.close() }
})
