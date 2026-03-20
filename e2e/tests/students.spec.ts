import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('shows not-found message for invalid student edit URL', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students/nonexistent-id/edit')
  await expect(page.getByText('Student not found.')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible()

  await context.close()
})

test('full student CRUD flow', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Navigate to students list
  await page.goto('/students')
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 15000 })

  // Navigate directly to create form
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  // Use a unique name to avoid conflicts with previous test runs
  const studentName = `Ana García ${Date.now()}`

  // Fill in the form
  await page.getByTestId('student-name').fill(studentName)

  // Select learning language
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()

  // Select CEFR level
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()

  // Add interests
  await page.getByTestId('interest-input').fill('travel')
  await page.getByTestId('interest-input').press('Enter')
  await page.getByTestId('interest-input').fill('music')
  await page.getByTestId('interest-input').press('Enter')

  // Select native language
  await page.getByTestId('student-native-language').click()
  await page.getByRole('option', { name: 'Portuguese' }).click()

  // Select a learning goal
  await page.getByTestId('learning-goals-trigger').click()
  await page.getByRole('option', { name: 'Travel' }).click()
  await page.keyboard.press('Escape')

  // Select a weakness
  await page.getByTestId('weaknesses-trigger').click()
  await page.getByRole('option', { name: 'Past Tenses' }).click()
  await page.keyboard.press('Escape')

  // Save
  await page.getByRole('button', { name: 'Save Student' }).click()

  // Should redirect to list and show the new student
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Find the student card using the per-row testid (scoped by student ID)
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await expect(studentCard.getByTestId('student-level')).toContainText('B2')
  await expect(studentCard.getByTestId('interest-chip').filter({ hasText: 'travel' })).toBeVisible()
  await expect(studentCard.getByTestId('native-language-chip')).toContainText('Portuguese speaker')

  // Edit: click the edit button within this student's card
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('student-name')).toHaveValue(studentName)

  // Confirm enrichment fields round-trip correctly
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('weakness-chip').filter({ hasText: 'Past Tenses' })).toBeVisible()

  // Change CEFR level to C1
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'C1' }).click()

  await page.getByRole('button', { name: 'Update Student' }).click()

  // Back on list — should show updated level
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  const updatedCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(updatedCard.getByTestId('student-level')).toContainText('C1', { timeout: 10000 })

  // Delete
  await updatedCard.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()

  // Student should no longer be in the list
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName })
    })
  ).not.toBeVisible({ timeout: 10000 })

  await context.close()
})
