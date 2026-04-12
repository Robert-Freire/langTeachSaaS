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

test('students list loads and renders the table with student rows', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students')
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 15000 })

  // Table renders with at least one student row (seeded by setupMockTeacher)
  const firstRow = page.locator('[data-testid^="student-row-"]').first()
  await expect(firstRow).toBeVisible({ timeout: 10000 })

  // Name, level badge, and native language cell are present
  await expect(firstRow.getByTestId('student-name')).toBeVisible()
  await expect(firstRow.getByTestId('student-level')).toBeVisible()
  await expect(firstRow.getByTestId('native-language-chip')).toBeVisible()

  await context.close()
})

test('student list row click navigates to student detail', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students')
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 15000 })

  // Click the first student row (not the edit/delete buttons)
  const firstRow = page.locator('[data-testid^="student-row-"]').first()
  await expect(firstRow).toBeVisible({ timeout: 10000 })
  await firstRow.click()

  // Should navigate to the student detail page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  await context.close()
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

test('creates student with lexical weakness and verifies round-trip', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Lexical Weakness Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Add a weakness row with lexical type
  await page.getByTestId('add-weakness').click()
  await page.getByTestId('weakness-description').fill('Vocabulary gaps for travel')
  await page.getByTestId('weakness-type').click()
  await page.getByRole('option', { name: 'Lexical' }).click()

  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })

  // Find the student card and navigate to edit
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })

  // Verify weakness round-tripped correctly
  const descInput = page.getByTestId('weakness-description')
  await expect(descInput).toHaveValue('Vocabulary gaps for travel', { timeout: 5000 })
  const typeSelect = page.getByTestId('weakness-type')
  await expect(typeSelect).toContainText('Lexical', { timeout: 5000 })

  // Cleanup
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
      has: page.getByTestId('student-name').filter({ hasText: studentName })
    })
  ).not.toBeVisible({ timeout: 10000 })

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
  await page.keyboard.press('Escape')

  // Select a learning goal
  await page.getByTestId('learning-goals-trigger').click()
  await page.getByRole('option', { name: 'Travel' }).click()
  await page.keyboard.press('Escape')

  // Add a weakness using the row-based compound input
  await page.getByTestId('add-weakness').click()
  await page.getByTestId('weakness-description').fill('Ser/Estar')

  // Add a structured difficulty
  const addDiffBtn = page.getByTestId('add-difficulty')
  await addDiffBtn.scrollIntoViewIfNeeded()
  await addDiffBtn.click()
  const diffRow = page.getByTestId('difficulty-row').first()
  await expect(diffRow).toBeVisible({ timeout: 10000 })

  // Fill difficulty description
  await diffRow.getByTestId('difficulty-description').fill('Confuses ser/estar in past tense')

  // Select competency
  await diffRow.getByTestId('difficulty-competency').click()
  await page.getByRole('option', { name: 'Grammar' }).click()

  // Fill subcategory
  await diffRow.getByTestId('difficulty-subcategory').fill('ser/estar')

  // Save
  await page.getByRole('button', { name: 'Save Student' }).click()

  // Should redirect to student profile page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Navigate to list to verify the new student appears
  await page.goto('/students')
  await expect(page.locator('h1')).toHaveText('Students', { timeout: 10000 })

  // Find the student card using the per-row testid (scoped by student ID)
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await expect(studentCard.getByTestId('student-level')).toContainText('B2')
  await expect(studentCard.getByTestId('interest-chip').filter({ hasText: 'travel' })).toBeAttached()
  await expect(studentCard.getByTestId('native-language-chip')).toContainText('Portuguese')

  // Edit: click the edit button within this student's card
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('student-name')).toHaveValue(studentName)

  // Confirm enrichment fields round-trip correctly
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('weakness-description')).toHaveValue('Ser/Estar')

  // Verify difficulty persisted
  const editDiffRow = page.getByTestId('difficulty-row')
  await expect(editDiffRow).toBeVisible({ timeout: 5000 })
  await expect(editDiffRow.getByTestId('difficulty-description')).toHaveValue('Confuses ser/estar in past tense')

  // Modify the difficulty description
  await editDiffRow.getByTestId('difficulty-description').fill('ser/estar in all tenses')

  // Change CEFR level to C1
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'C1' }).click()

  await page.getByRole('button', { name: 'Update Student' }).click()

  // Should redirect to student profile page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Navigate to list to verify updated level
  await page.goto('/students')
  const updatedCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(updatedCard.getByTestId('student-level')).toContainText('C1', { timeout: 10000 })

  // Re-enter edit to verify difficulty was updated and remove it
  await updatedCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  const verifyDiffRow = page.getByTestId('difficulty-row')
  await expect(verifyDiffRow.getByTestId('difficulty-description')).toHaveValue('ser/estar in all tenses')

  // Remove the difficulty
  await verifyDiffRow.getByTestId('remove-difficulty').click()
  await expect(page.getByTestId('difficulty-row')).not.toBeVisible()

  await page.getByRole('button', { name: 'Update Student' }).click()

  // Should redirect to student profile page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Navigate to list to re-enter edit for verification
  await page.goto('/students')
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

  // Add a weakness using the row-based input
  await page.getByTestId('add-weakness').click()
  await page.getByTestId('weakness-description').fill('irregular verb conjugation')

  // Save
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Navigate to list to verify persistence
  await page.goto('/students')
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: 10000 })
  await studentCard.getByTestId('edit-student').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })

  // Verify predefined and custom goals persisted
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-chip').filter({ hasText: 'pass DELE B2 in June' })).toBeVisible()
  await expect(page.getByTestId('weakness-description')).toHaveValue('irregular verb conjugation')

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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Navigate to list then to edit page
  await page.goto('/students')
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

test('student detail shows 4 tabs and overview content by default', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Profile Tab Test ${Date.now()}`

  // Create a student with native language set
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByTestId('student-native-language').click()
  await page.getByRole('option', { name: 'Portuguese' }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Save Student' }).click()

  // Should redirect directly to student detail page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // All 4 tabs should be visible
  await expect(page.getByTestId('tab-overview')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('tab-profile')).toBeVisible()
  await expect(page.getByTestId('tab-sessions')).toBeVisible()
  await expect(page.getByTestId('tab-progress')).toBeVisible()

  // Overview tab content should be visible by default
  await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('primary-objective-card')).toBeVisible()

  // Click Profile tab
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: 10000 })

  // CEFR badge and header actions should be visible
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('edit-profile-link')).toBeVisible()
  await expect(page.getByTestId('log-session-button')).toBeVisible()

  // Switch to Sessions tab (new student has no sessions)
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-empty')).toBeVisible({ timeout: 10000 })

  // Switch to Progress tab (new student has no course)
  await page.getByTestId('tab-progress').click()
  await expect(page.getByTestId('progress-no-course')).toBeVisible({ timeout: 10000 })

  // Switch back to Profile tab
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: 10000 })

  // Cleanup: go back and delete student
  await page.goto('/students')
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

test('saves and displays SpokenLanguages, OfficialCefrLevel, and SkillLevelOverrides', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Language Fields Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Set Official Level
  await page.getByTestId('student-official-cefr').click()
  await page.getByRole('option', { name: 'A2' }).click()

  // Add a spoken language
  await page.getByTestId('spoken-language-input').fill('English')
  await page.getByTestId('spoken-language-input').press('Enter')
  await expect(page.getByTestId('spoken-lang-chip').first()).toBeVisible({ timeout: 5000 })

  // Set skill override for Reading
  await page.getByTestId('skill-override-reading').click()
  await page.getByRole('option', { name: 'B2' }).click()

  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/[^/]+$/, { timeout: 10000 })

  // Verify Overview tab shows skill bar
  await expect(page.getByTestId('tab-overview')).toBeVisible({ timeout: 5000 })
  const overviewSkillBadge = page.getByTestId('overview-skill-badge-reading')
  await expect(overviewSkillBadge).toBeVisible({ timeout: 5000 })
  await expect(overviewSkillBadge).toHaveText('B2')

  // Switch to Profile tab and verify Language Ecosystem and Skill Assessment
  await page.getByTestId('tab-profile').click()
  const langSection = page.getByTestId('profile-language-ecosystem')
  await expect(langSection).toBeVisible({ timeout: 5000 })
  await expect(langSection).toContainText('English')
  await expect(langSection).toContainText('A2')

  const skillSection = page.getByTestId('profile-skill-assessment')
  await expect(skillSection).toBeVisible({ timeout: 5000 })
  await expect(skillSection).toContainText('Reading')
  await expect(skillSection).toContainText('B2')

  // Cleanup
  await page.goto('/students')
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
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

test('identity fields round-trip: save and verify in profile view and edit form', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Identity Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()

  // Fill identity fields
  await page.getByTestId('student-birth-year').fill('1990')
  await page.getByTestId('student-profession').fill('Architect')
  await page.getByTestId('student-country-origin').fill('Portugal')
  await page.getByTestId('student-city-origin').fill('Lisbon')
  await page.getByTestId('student-country-residence').fill('Spain')
  await page.getByTestId('student-city-residence').fill('Madrid')

  await page.getByRole('button', { name: 'Save Student' }).click()

  // Should redirect to student detail page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Header shows profession and compact location (visible on all tabs)
  await expect(page.getByTestId('student-header-profession')).toHaveText('Architect', { timeout: 5000 })
  await expect(page.getByTestId('student-header-location')).toHaveText('Lisbon / Madrid', { timeout: 5000 })

  // Navigate to Profile tab to check identity details
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('profile-about')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Lisbon, Portugal')).toBeVisible()
  await expect(page.getByText('Madrid, Spain')).toBeVisible()
  await expect(page.getByText(/1990 \(\d+ years\)/)).toBeVisible()

  // Navigate to edit and verify round-trip
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('student-birth-year')).toHaveValue('1990')
  await expect(page.getByTestId('student-profession')).toHaveValue('Architect')
  await expect(page.getByTestId('student-country-origin')).toHaveValue('Portugal')
  await expect(page.getByTestId('student-city-origin')).toHaveValue('Lisbon')
  await expect(page.getByTestId('student-country-residence')).toHaveValue('Spain')
  await expect(page.getByTestId('student-city-residence')).toHaveValue('Madrid')

  // Cleanup
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  const deleteCardIdentity = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await deleteCardIdentity.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: 10000 })

  await context.close()
})

test('motivation fields: reason for studying and objectives round-trip', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Motivation Test ${Date.now()}`
  const reasonText = 'Moving to Spain for work next year'
  const objectiveText = 'Pass DELE B2 exam'

  // Create student with motivation fields
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()

  // Fill reason for studying
  await page.getByTestId('student-reason-for-studying').fill(reasonText)

  // Add a short-term objective
  await page.getByTestId('add-objective').click()
  await page.getByTestId('objective-text-input').fill(objectiveText)

  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Overview tab: primary objective card shows the objective
  await expect(page.getByTestId('primary-objective-card')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('objective-text')).toHaveText(objectiveText)

  // Profile tab: hero section shows reason for studying as a quote
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('profile-hero')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('reason-quote')).toContainText(reasonText)

  // Profile tab: objectives section shows objective
  await expect(page.getByTestId('profile-objectives')).toBeVisible()
  await expect(page.getByTestId('profile-objectives').getByText(objectiveText)).toBeVisible()

  // Navigate to edit form and verify round-trip
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: 10000 })
  await expect(page.getByTestId('student-reason-for-studying')).toHaveValue(reasonText)
  await expect(page.getByTestId('objective-row')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('objective-text-input')).toHaveValue(objectiveText)

  // Cleanup
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/students', { timeout: 10000 })
  const deleteCardM = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await deleteCardM.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: 10000 })

  await context.close()
})

test('Ana Visual profile tab shows Focus Areas section with difficulties and weaknesses', async ({ browser }) => {
  const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'
  const AUTH_HEADER = { Authorization: 'Bearer test-token' }

  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Find Ana Visual via the API (she is a demo seed student with difficulties and weaknesses)
  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ name: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  const anaVisual = students.find((s) => s.name === 'Ana Visual')
  if (!anaVisual) throw new Error('Ana Visual not found. Ensure the demo seeder has run.')

  await page.goto(`/students/${anaVisual.id}`)

  // Navigate to Profile tab
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: 10000 })

  // Focus Areas & Difficulties section renders
  const focusSection = page.getByTestId('profile-focus-areas')
  await expect(focusSection).toBeVisible()

  // Difficulty rows render with Trend and Status
  const diffRows = page.getByTestId('difficulty-row')
  await expect(diffRows.first()).toBeVisible()

  // At least one difficulty has a Working or Covered status
  const statusEls = page.getByTestId(/^difficulty-status-/)
  await expect(statusEls.first()).toBeVisible()

  // Weaknesses section renders with category badges
  const weaknessSection = page.getByTestId('profile-weaknesses')
  await expect(weaknessSection).toBeVisible()
  const badges = page.getByTestId('weakness-type-badge')
  await expect(badges.first()).toBeVisible()

  await context.close()
})

test('teaching todos: add, toggle covered, verify ordering on overview tab', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Todo E2E Test ${Date.now()}`

  // Create a student to work with
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Verify we're on the overview tab (default)
  await expect(page.getByTestId('tab-overview')).toHaveAttribute('aria-selected', 'true', { timeout: 5000 })
  await expect(page.getByTestId('teaching-todos-card')).toBeVisible({ timeout: 5000 })

  // Empty state is shown
  await expect(page.getByTestId('teaching-todos-empty')).toBeVisible()

  // Add a teaching todo
  const addInput = page.getByTestId('todo-add-input')
  await addInput.fill('Practice ser vs estar')
  await page.getByTestId('todo-add-btn').click()

  // Todo appears in list
  await expect(page.getByTestId('teaching-todos-list')).toBeVisible({ timeout: 5000 })
  const firstTodo = page.getByTestId('teaching-todo-item').first()
  await expect(firstTodo).toContainText('Practice ser vs estar')

  // Add a second todo
  await addInput.fill('Review subjunctive mood')
  await page.getByTestId('todo-add-btn').click()
  await expect(page.getByTestId('teaching-todo-item')).toHaveCount(2, { timeout: 5000 })

  // Mark the first todo as covered — capture id before any reorder so locators stay stable
  const toggleTestId = await page.getByTestId('teaching-todo-item').first().getByTestId(/^todo-toggle-/).getAttribute('data-testid')
  expect(toggleTestId).toBeTruthy()
  const todoId = toggleTestId!.replace('todo-toggle-', '')
  const todoText = await page.getByTestId(`todo-text-${todoId}`).textContent()

  await page.getByTestId(`todo-toggle-${todoId}`).click()

  // Wait for covered state (strikethrough)
  await expect(page.getByTestId(`todo-text-${todoId}`)).toHaveClass(/line-through/, { timeout: 5000 })

  // Verify ordering: pending todo should appear before covered
  const reorderedItems = page.getByTestId('teaching-todo-item')
  const firstText = await reorderedItems.first().getByTestId(/^todo-text-/).textContent()
  const lastText = await reorderedItems.last().getByTestId(/^todo-text-/).textContent()
  expect(firstText).not.toEqual(todoText) // the one we covered should now be last
  expect(lastText).toEqual(todoText)

  // Cleanup: delete the student
  await page.goto('/students')
  const row = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await row.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(row).not.toBeVisible({ timeout: 10000 })

  await context.close()
})

test('log session page: create session from full-page form and redirect back', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `LogSessionTest_${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Click "Log Session" button - should navigate to full page
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('log-session-button').click()

  // Assert full-page route
  await expect(page).toHaveURL(/\/students\/[^/]+\/log-session$/, { timeout: 10000 })

  // Left panel shows student name and session number
  await expect(page.getByTestId('student-name')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('student-name')).toHaveText(studentName)
  await expect(page.getByTestId('session-number')).toHaveText('Session #1')

  // Right panel: date defaults to today
  await expect(page.getByTestId('session-date')).toBeVisible()
  const today = new Date().toISOString().split('T')[0]
  await expect(page.getByTestId('session-date')).toHaveValue(today)

  // Fill in "What Happened?"
  await page.getByTestId('actual-content').fill('Covered introduction to present tense.')

  // Submit
  await page.getByTestId('submit-button').click()

  // Should redirect back to student detail
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 15000 })

  // Sessions tab should show the new session
  await page.getByTestId('tab-sessions').click()
  const sessionEntries = page.locator('[data-testid="session-entry"]')
  await expect(sessionEntries.first()).toBeVisible({ timeout: 10000 })

  // Cleanup: delete student
  await page.goto('/students')
  const row = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await row.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(row).not.toBeVisible({ timeout: 10000 })

  await context.close()
})

test('overview tab: header badges, pedagogical profile, teaching notes panel visible', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `OverviewSectionsTest_${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: 10000 })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: 10000 })

  // Header status badge should show Active + Private
  await expect(page.getByTestId('student-status-badge')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('student-status-badge')).toContainText('Active')
  await expect(page.getByTestId('student-status-badge')).toContainText('Private')

  // Pedagogical Profile card present
  await expect(page.getByTestId('pedagogical-profile-card')).toBeVisible({ timeout: 10000 })

  // Recent sessions empty state (no sessions yet)
  await expect(page.getByTestId('recent-sessions-empty')).toBeVisible({ timeout: 10000 })

  // Teaching notes panel visible with Add Memory button
  await expect(page.getByTestId('teaching-notes-panel')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('add-memory-btn')).toBeVisible()

  // Cleanup
  await page.goto('/students')
  const overviewRow = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await overviewRow.getByTestId('delete-student').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('confirm-delete').click()
  await expect(overviewRow).not.toBeVisible({ timeout: 10000 })

  await context.close()
})
