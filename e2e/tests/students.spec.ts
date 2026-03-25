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
  const goBack = page.getByRole('button', { name: 'Go back' })
  await expect(goBack).toBeVisible()
  await goBack.click()
  await expect(page).toHaveURL('/students', { timeout: 15000 })

  await context.close()
})

test('weakness options are filtered by target language', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  // Select English as learning language
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'English' }).click()

  // Open weaknesses dropdown and verify English-specific options appear
  await page.getByTestId('weaknesses-trigger').click()
  await expect(page.getByRole('option', { name: 'Phrasal Verbs' })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('option', { name: 'Past Tenses' })).toBeVisible()
  // Spanish-specific option should not appear
  await expect(page.getByRole('option', { name: 'Ser/Estar' })).not.toBeVisible()
  await page.keyboard.press('Escape')

  // Switch to Spanish
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()

  // Open weaknesses dropdown and verify Spanish-specific options appear
  await page.getByTestId('weaknesses-trigger').click()
  await expect(page.getByRole('option', { name: 'Ser/Estar' })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('option', { name: 'Past Tenses' })).toBeVisible()
  // English-specific option should not appear
  await expect(page.getByRole('option', { name: 'Phrasal Verbs' })).not.toBeVisible()

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

  // Select a weakness (Ser/Estar is Spanish-specific, verifying language filtering)
  await page.getByTestId('weaknesses-trigger').click()
  await page.getByRole('option', { name: 'Ser/Estar' }).click()
  await page.keyboard.press('Escape')

  // Add a structured difficulty
  const addDiffBtn = page.getByTestId('add-difficulty')
  await addDiffBtn.scrollIntoViewIfNeeded()
  await addDiffBtn.click()
  const diffRow = page.getByTestId('difficulty-row').first()
  await expect(diffRow).toBeVisible({ timeout: 10000 })

  // Fill difficulty item text first (most reliable)
  await diffRow.getByTestId('difficulty-item').fill('ser/estar in past tense')

  // Select category
  await diffRow.getByTestId('difficulty-category').click()
  await page.getByRole('option', { name: 'Grammar' }).click()

  // Select severity
  await diffRow.getByTestId('difficulty-severity').click()
  await page.getByRole('option', { name: 'High' }).click()

  // Select trend
  await diffRow.getByTestId('difficulty-trend').click()
  await page.getByRole('option', { name: 'Stable' }).click()

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
  await expect(page.getByTestId('weakness-chip').filter({ hasText: 'Ser/Estar' })).toBeVisible()

  // Verify difficulty persisted
  const editDiffRow = page.getByTestId('difficulty-row')
  await expect(editDiffRow).toBeVisible({ timeout: 5000 })
  await expect(editDiffRow.getByTestId('difficulty-item')).toHaveValue('ser/estar in past tense')

  // Modify the difficulty item text
  await editDiffRow.getByTestId('difficulty-item').fill('ser/estar in all tenses')

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

  // Re-enter edit to verify difficulty was updated and remove it
  await updatedCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  const verifyDiffRow = page.getByTestId('difficulty-row')
  await expect(verifyDiffRow.getByTestId('difficulty-item')).toHaveValue('ser/estar in all tenses')

  // Remove the difficulty
  await verifyDiffRow.getByTestId('remove-difficulty').click()
  await expect(page.getByTestId('difficulty-row')).not.toBeVisible()

  await page.getByRole('button', { name: 'Update Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Verify difficulty is gone by re-entering edit
  const finalCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await finalCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('difficulty-row')).not.toBeVisible()
  await expect(page.getByText('No specific difficulties tracked yet.')).toBeVisible()

  // Go back to list for delete step
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Delete
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.getByTestId('delete-student').click()
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

test('custom free-text learning goal persists after save', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Custom Goals ${Date.now()}`

  // Create a student with a custom learning goal
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  await page.getByTestId('student-name').fill(studentName)

  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()

  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Select a predefined goal
  await page.getByTestId('learning-goals-trigger').click()
  await page.getByRole('option', { name: 'Travel' }).click()
  await page.keyboard.press('Escape')

  // Helper to add a custom entry: fills the command input then selects "Add"
  async function addCustomEntry(triggerTestId: string, text: string) {
    await page.getByTestId(triggerTestId).click()
    // Radix keeps both popover inputs visible in DOM; .last() targets the
    // most recently opened popover (`:visible` resolves to 2 elements)
    const cmdInput = page.locator('input[cmdk-input]').last()
    await cmdInput.fill(text)
    // Wait for React to render the "Add" option
    const addBtn = page.getByTestId('add-custom-entry')
    await expect(addBtn).toBeVisible({ timeout: 5000 })
    await addBtn.click()
    await page.keyboard.press('Escape')
  }

  // Add a custom learning goal
  await addCustomEntry('learning-goals-trigger', 'pass DELE B2 in June')

  // Verify both chips are visible before saving
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'pass DELE B2 in June' })).toBeVisible()

  // Add a custom weakness
  await addCustomEntry('weaknesses-trigger', 'irregular verb conjugation')

  await expect(page.getByTestId('weakness-chip').filter({ hasText: 'irregular verb conjugation' })).toBeVisible()

  // Save
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Navigate to edit and verify persistence
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })

  // Verify predefined and custom goals persisted
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'pass DELE B2 in June' })).toBeVisible()
  await expect(page.getByTestId('weakness-chip').filter({ hasText: 'irregular verb conjugation' })).toBeVisible()

  // Clean up: go back and delete the student
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: 10000 })

  await context.close()
})

test('"Create Course" button on student edit page navigates to CourseNew with student pre-selected', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a student with full profile
  const studentName = `Create Course Test ${Date.now()}`
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Navigate to edit page via edit button
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })

  // Capture the student ID from the edit URL
  const editUrl = page.url()
  const studentId = editUrl.match(/\/students\/([^/]+)\/edit/)?.[1]
  expect(studentId).toBeTruthy()

  // "Create Course" button should be visible and enabled (profile is complete)
  const createCourseBtn = page.getByTestId('create-course-btn')
  await expect(createCourseBtn).toBeVisible({ timeout: 5000 })
  await expect(createCourseBtn).not.toBeDisabled()

  // Click it and verify navigation
  await createCourseBtn.click()
  await expect(page).toHaveURL(`/courses/new?studentId=${studentId}`, { timeout: 10000 })

  // Student should appear as locked (not a dropdown)
  const lockedStudent = page.getByTestId('student-locked')
  await expect(lockedStudent).toBeVisible({ timeout: 10000 })
  await expect(lockedStudent).toContainText(studentName)
  await expect(page.getByTestId('student-select')).not.toBeVisible()

  await context.close()
})
