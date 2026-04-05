import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { UI_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('lesson sections match template and support add/remove', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a lesson from the Conversation template (4 sections, no Presentation)
  await page.goto('/lessons/new')
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 15000 })
  await page.getByTestId('template-conversation').click()

  await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: 10000 })

  const lessonTitle = `Sections Test ${Date.now()}`
  await page.getByTestId('input-title').fill(lessonTitle)
  await page.getByTestId('select-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByTestId('select-level').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('input-topic').fill('Daily routines')
  await page.getByTestId('select-duration').click()
  await page.getByRole('option', { name: '60 min' }).click()
  await page.getByTestId('submit-lesson').click()

  // Wait for lesson editor to load
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: 10000 })
  await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: 10000 })

  // Conversation template has 5 sections: WarmUp, Presentation, Practice, Production, WrapUp
  await expect(page.getByTestId('section-card-warmup')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('section-card-presentation')).toBeVisible()
  await expect(page.getByTestId('section-card-practice')).toBeVisible()
  await expect(page.getByTestId('section-card-production')).toBeVisible()
  await expect(page.getByTestId('section-card-wrapup')).toBeVisible()

  // Count section cards: should be exactly 5
  const sectionCards = page.locator('[data-testid^="section-card-"]')
  await expect(sectionCards).toHaveCount(5)

  // Add Section dropdown should be hidden (all 5 types present)
  await expect(page.getByTestId('add-section-container')).not.toBeVisible()

  // Remove the Presentation section
  await page.getByTestId('remove-section-presentation').click()
  // Confirm removal dialog
  await page.getByTestId('confirm-remove-section').click()

  // Verify section count decreases to 4 and add-section dropdown reappears
  await expect(page.getByTestId('section-card-presentation')).not.toBeVisible({ timeout: UI_TIMEOUT })
  await expect(sectionCards).toHaveCount(4)
  await expect(page.getByTestId('add-section-select')).toBeVisible()

  // Add Presentation back via dropdown
  await page.getByTestId('add-section-select').click()
  await page.getByRole('option', { name: 'Presentation' }).click()

  // Verify 5 sections again
  await expect(page.getByTestId('section-card-presentation')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(sectionCards).toHaveCount(5)

  await context.close()
})
