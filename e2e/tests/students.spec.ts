import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

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
  await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

  // Table renders with at least one student row (seeded by setupMockTeacher)
  const firstRow = page.locator('[data-testid^="student-row-"]').first()
  await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

  // Click the first student row (not the edit/delete buttons)
  const firstRow = page.locator('[data-testid^="student-row-"]').first()
  await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT })
  await firstRow.click()

  // Should navigate to the student detail page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  await context.close()
})

test('shows not-found message for invalid student edit URL', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students/nonexistent-id/edit')
  await expect(page.getByText('Student not found.')).toBeVisible({ timeout: NAV_TIMEOUT })
  const goBack = page.getByRole('button', { name: 'Go back' })
  await expect(goBack).toBeVisible()
  await goBack.click()
  await expect(page).toHaveURL('/students', { timeout: NAV_TIMEOUT })

  await context.close()
})

test('creates student with lexical weakness and verifies round-trip', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Lexical Weakness Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Go to roster to find the student card and navigate to edit
  await page.goto('/students')
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: UI_TIMEOUT })
  await studentCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Verify weakness round-tripped correctly
  const descInput = page.getByTestId('weakness-description')
  await expect(descInput).toHaveValue('Vocabulary gaps for travel', { timeout: FEEDBACK_TIMEOUT })
  const typeSelect = page.getByTestId('weakness-type')
  await expect(typeSelect).toContainText('Lexical', { timeout: FEEDBACK_TIMEOUT })

  // Cleanup
  await page.goto('/students')
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName })
    })
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('full student CRUD flow', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Navigate to students list
  await page.goto('/students')
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {})
  await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

  // Navigate directly to create form
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

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

  // Add a learning goal via tree editor
  await page.getByTestId('learning-goal-add-btn').click()
  await page.getByTestId('learning-goal-top-input').fill('Travel')
  await page.keyboard.press('Enter')

  // Add a weakness using the row-based compound input
  await page.getByTestId('add-weakness').click()
  await page.getByTestId('weakness-description').fill('Ser/Estar')

  // Add a structured difficulty
  const addDiffBtn = page.getByTestId('add-difficulty')
  await addDiffBtn.scrollIntoViewIfNeeded()
  await addDiffBtn.click()
  const diffRow = page.getByTestId('difficulty-row').first()
  await expect(diffRow).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to list to verify the new student appears
  await page.goto('/students')
  await expect(page.locator('h1')).toHaveText('Students', { timeout: UI_TIMEOUT })

  // Find the student card using the per-row testid (scoped by student ID)
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(studentCard.getByTestId('student-level')).toContainText('B2')
  await expect(studentCard.getByTestId('interest-chip').filter({ hasText: 'travel' })).toBeAttached()
  await expect(studentCard.getByTestId('native-language-chip')).toContainText('Portuguese')

  // Edit: navigate to detail then click edit
  await studentCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('student-name')).toHaveValue(studentName)

  // Confirm enrichment fields round-trip correctly
  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('weakness-description')).toHaveValue('Ser/Estar')

  // Verify difficulty persisted
  const editDiffRow = page.getByTestId('difficulty-row')
  await expect(editDiffRow).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(editDiffRow.getByTestId('difficulty-description')).toHaveValue('Confuses ser/estar in past tense')

  // Modify the difficulty description
  await editDiffRow.getByTestId('difficulty-description').fill('ser/estar in all tenses')

  // Change CEFR level to C1
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'C1' }).click()

  // Wait for autosave to complete then navigate via Done button
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await page.getByTestId('done-btn').click()

  // Should redirect to student profile page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to list to verify updated level
  await page.goto('/students')
  const updatedCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(updatedCard.getByTestId('student-level')).toContainText('C1', { timeout: UI_TIMEOUT })

  // Re-enter edit to verify difficulty was updated and remove it
  await updatedCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  const verifyDiffRow = page.getByTestId('difficulty-row')
  await expect(verifyDiffRow.getByTestId('difficulty-description')).toHaveValue('ser/estar in all tenses')

  // Remove the difficulty
  await verifyDiffRow.getByTestId('remove-difficulty').click()
  await expect(page.getByTestId('difficulty-row')).not.toBeVisible()

  // Wait for autosave to complete then navigate via Done button
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await page.getByTestId('done-btn').click()

  // Should redirect to student profile page
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to list to re-enter edit for verification
  await page.goto('/students')
  const finalCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await finalCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('difficulty-row')).not.toBeVisible()
  await expect(page.getByText('No specific difficulties tracked yet.')).toBeVisible()

  // Go back to list for delete step
  await page.goto('/students')

  // Delete
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  // Student should no longer be in the list
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName })
    })
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('custom free-text learning goal persists after save', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Custom Goals ${Date.now()}`

  // Create a student with a custom learning goal
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

  await page.getByTestId('student-name').fill(studentName)

  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()

  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Add two learning goals via tree editor
  await page.getByTestId('learning-goal-add-btn').click()
  await page.getByTestId('learning-goal-top-input').fill('Travel')
  await page.keyboard.press('Enter')

  await page.getByTestId('learning-goal-add-btn').click()
  await page.getByTestId('learning-goal-top-input').fill('pass DELE B2 in June')
  await page.keyboard.press('Enter')

  // Verify both goals are visible before saving
  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'pass DELE B2 in June' })).toBeVisible()

  // Add a weakness using the row-based input
  await page.getByTestId('add-weakness').click()
  await page.getByTestId('weakness-description').fill('irregular verb conjugation')

  // Save
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to list to verify persistence
  await page.goto('/students')
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: UI_TIMEOUT })
  await studentCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Verify goals persisted
  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'Travel' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'pass DELE B2 in June' })).toBeVisible()
  await expect(page.getByTestId('weakness-description')).toHaveValue('irregular verb conjugation')

  // Clean up: go back and delete the student
  await page.goto('/students')
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('"Create Course" button on student edit page navigates to CourseNew with student pre-selected', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Create a student with full profile
  const studentName = `Create Course Test ${Date.now()}`
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to list then to edit page
  await page.goto('/students')
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: UI_TIMEOUT })
  await studentCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Capture the student ID from the edit URL
  const editUrl = page.url()
  const studentId = editUrl.match(/\/students\/([^/]+)\/edit/)?.[1]
  expect(studentId).toBeTruthy()

  // "Create Course" button should be visible and enabled (profile is complete)
  const createCourseBtn = page.getByTestId('create-course-btn')
  await expect(createCourseBtn).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(createCourseBtn).not.toBeDisabled()

  // Click it and verify navigation
  await createCourseBtn.click()
  await expect(page).toHaveURL(`/courses/new?studentId=${studentId}`, { timeout: UI_TIMEOUT })

  // Student should appear as locked (not a dropdown)
  const lockedStudent = page.getByTestId('student-locked')
  await expect(lockedStudent).toBeVisible({ timeout: UI_TIMEOUT })
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
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // All 4 tabs should be visible
  await expect(page.getByTestId('tab-overview')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('tab-profile')).toBeVisible()
  await expect(page.getByTestId('tab-sessions')).toBeVisible()
  await expect(page.getByTestId('tab-progress')).toBeVisible()

  // Overview tab content should be visible by default
  await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })
  // No objective set for this student, so primary-objective-card should be hidden
  await expect(page.getByTestId('primary-objective-card')).not.toBeVisible()

  // Click Profile tab
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

  // CEFR badge and header actions should be visible
  await expect(page.getByTestId('cefr-badge')).toBeVisible()
  await expect(page.getByTestId('edit-profile-link')).toBeVisible()
  await expect(page.getByTestId('log-session-button')).toBeVisible()

  // Switch to Sessions tab (new student has no sessions)
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-empty')).toBeVisible({ timeout: UI_TIMEOUT })

  // Switch to Progress tab (new student has no sessions or skill overrides)
  await page.getByTestId('tab-progress').click()
  await expect(page.getByTestId('progress-tab-content')).toBeVisible({ timeout: UI_TIMEOUT })

  // Switch back to Profile tab
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

  // Cleanup: go back and delete student
  await page.goto('/students')
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await deleteCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('saves and displays SpokenLanguages, OfficialCefrLevel, and SkillLevelOverrides', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Language Fields Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Set Official Level
  await page.getByTestId('student-official-cefr').click()
  await page.getByRole('option', { name: 'A2' }).click()

  // Add a spoken language
  await page.getByTestId('spoken-languages-container').click()
  await page.getByPlaceholder('Search or type custom...').fill('English')
  await page.getByRole('option', { name: 'English' }).click()
  await expect(page.getByTestId('spoken-lang-chip').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Set skill override for Reading
  await page.getByTestId('skill-override-reading').click()
  await page.getByRole('option', { name: 'B2' }).click()

  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/[^/]+$/, { timeout: UI_TIMEOUT })

  // Verify Overview tab shows skill bar
  await expect(page.getByTestId('tab-overview')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  const overviewSkillBadge = page.getByTestId('overview-skill-badge-reading')
  await expect(overviewSkillBadge).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(overviewSkillBadge).toHaveText('B2')

  // Switch to Profile tab and verify Language Ecosystem and Skill Assessment
  await page.getByTestId('tab-profile').click()
  const langSection = page.getByTestId('profile-language-ecosystem')
  await expect(langSection).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(langSection).toContainText('English')
  await expect(langSection).toContainText('A2')

  const skillSection = page.getByTestId('profile-skill-assessment')
  await expect(skillSection).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(skillSection).toContainText('Reading')
  await expect(skillSection).toContainText('B2')

  // Cleanup
  await page.goto('/students')
  const deleteCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await deleteCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('identity fields round-trip: save and verify in profile view and edit form', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Identity Test ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Header shows profession and compact location (visible on all tabs)
  await expect(page.getByTestId('student-header-profession')).toHaveText('Architect', { timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('student-header-location')).toHaveText('Lisbon / Madrid', { timeout: FEEDBACK_TIMEOUT })

  // Navigate to Profile tab to check identity details
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('profile-about')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByText('Lisbon, Portugal')).toBeVisible()
  await expect(page.getByText('Madrid, Spain')).toBeVisible()
  await expect(page.getByText(/1990 \(\d+ years\)/)).toBeVisible()

  // Navigate to edit and verify round-trip
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('student-birth-year')).toHaveValue('1990')
  await expect(page.getByTestId('student-profession')).toHaveValue('Architect')
  await expect(page.getByTestId('student-country-origin')).toHaveValue('Portugal')
  await expect(page.getByTestId('student-city-origin')).toHaveValue('Lisbon')
  await expect(page.getByTestId('student-country-residence')).toHaveValue('Spain')
  await expect(page.getByTestId('student-city-residence')).toHaveValue('Madrid')

  // Cleanup
  await page.goto('/students')
  const deleteCardIdentity = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await deleteCardIdentity.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Header: primary objective card shows the objective (visible on all tabs)
  await expect(page.getByTestId('primary-objective-card')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('objective-text')).toHaveText(objectiveText)

  // Profile tab: hero section shows reason for studying as a quote
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('profile-hero')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('reason-quote')).toContainText(reasonText)

  // Profile tab: objectives section shows objective
  await expect(page.getByTestId('profile-objectives')).toBeVisible()
  await expect(page.getByTestId('profile-objectives').getByText(objectiveText)).toBeVisible()

  // Navigate to edit form and verify round-trip
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('student-reason-for-studying')).toHaveValue(reasonText)
  await expect(page.getByTestId('objective-row')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('objective-text-input')).toHaveValue(objectiveText)

  // Cleanup
  await page.goto('/students')
  const deleteCardM = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await deleteCardM.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(
    page.locator('[data-testid^="student-row-"]').filter({
      has: page.getByTestId('student-name').filter({ hasText: studentName }),
    }),
  ).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('Ana Visual profile tab shows Focus Areas section with difficulties and weaknesses', async ({ browser }) => {
  const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
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
  await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

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
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Verify we're on the overview tab (default)
  await expect(page.getByTestId('tab-overview')).toHaveAttribute('aria-selected', 'true', { timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('teaching-todos-card')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Empty state is shown
  await expect(page.getByTestId('teaching-todos-empty')).toBeVisible()

  // Add a teaching todo
  const addInput = page.getByTestId('todo-add-input')
  await addInput.fill('Practice ser vs estar')
  await page.getByTestId('todo-add-btn').click()

  // Todo appears in list
  await expect(page.getByTestId('teaching-todos-list')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  const firstTodo = page.getByTestId('teaching-todo-item').first()
  await expect(firstTodo).toContainText('Practice ser vs estar')

  // Add a second todo
  await addInput.fill('Review subjunctive mood')
  await page.getByTestId('todo-add-btn').click()
  await expect(page.getByTestId('teaching-todo-item')).toHaveCount(2, { timeout: FEEDBACK_TIMEOUT })

  // Mark the first todo as covered — capture id before any reorder so locators stay stable
  const toggleTestId = await page.getByTestId('teaching-todo-item').first().getByTestId(/^todo-toggle-/).getAttribute('data-testid')
  expect(toggleTestId).toBeTruthy()
  const todoId = toggleTestId!.replace('todo-toggle-', '')
  const todoText = await page.getByTestId(`todo-text-${todoId}`).textContent()

  await page.getByTestId(`todo-toggle-${todoId}`).click()

  // Wait for covered state (strikethrough)
  await expect(page.getByTestId(`todo-text-${todoId}`)).toHaveClass(/line-through/, { timeout: FEEDBACK_TIMEOUT })

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
  await row.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(row).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('teaching todos: toggle persists after reload and can be toggled back to pending', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `TodoPersist_${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })
  const detailUrl = page.url()

  // Navigate to edit student and add a todo via the sidebar card
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.goto(detailUrl)
  await expect(page.getByTestId('teaching-todos-card')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Add a todo
  await page.getByTestId('todo-add-input').fill('ser vs estar reminder')
  await page.getByTestId('todo-add-btn').click()
  await expect(page.getByTestId('teaching-todos-list')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Get the todo id
  const toggleBtn = page.getByTestId(/^todo-toggle-/).first()
  const toggleTestId = await toggleBtn.getAttribute('data-testid')
  const todoId = toggleTestId!.replace('todo-toggle-', '')

  // Toggle to covered — this previously returned 400
  await toggleBtn.click()
  await expect(page.getByTestId(`todo-text-${todoId}`)).toHaveClass(/line-through/, { timeout: FEEDBACK_TIMEOUT })

  // Reload and verify persistence
  await page.reload()
  await expect(page.getByTestId('teaching-todos-card')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId(`todo-text-${todoId}`)).toHaveClass(/line-through/, { timeout: FEEDBACK_TIMEOUT })

  // Toggle back to pending
  await page.getByTestId(`todo-toggle-${todoId}`).click()
  await expect(page.getByTestId(`todo-text-${todoId}`)).not.toHaveClass(/line-through/, { timeout: FEEDBACK_TIMEOUT })

  // Reload again and verify pending state persists
  await page.reload()
  await expect(page.getByTestId('teaching-todos-card')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId(`todo-text-${todoId}`)).not.toHaveClass(/line-through/, { timeout: FEEDBACK_TIMEOUT })

  // Cleanup
  await page.goto('/students')
  const row = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await row.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  await context.close()
})

test('log session page: create session from full-page form and redirect back', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `LogSessionTest_${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Click "Log Session" button - should navigate to full page
  await expect(page.getByTestId('log-session-button')).toBeVisible({ timeout: UI_TIMEOUT })
  await page.getByTestId('log-session-button').click()

  // Assert full-page route
  await expect(page).toHaveURL(/\/students\/[^/]+\/log-session$/, { timeout: UI_TIMEOUT })

  // Left panel shows student name and session number
  await expect(page.getByTestId('student-name')).toBeVisible({ timeout: UI_TIMEOUT })
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
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

  // Sessions tab should show the new session
  await page.getByTestId('tab-sessions').click()
  const sessionEntries = page.locator('[data-testid="session-entry"]')
  await expect(sessionEntries.first()).toBeVisible({ timeout: UI_TIMEOUT })

  // Cleanup: delete student
  await page.goto('/students')
  const row = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await row.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(row).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('overview tab: header badges, pedagogical profile, teaching notes panel visible', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `OverviewSectionsTest_${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Header status badge should show Active + Private
  await expect(page.getByTestId('student-status-badge')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('student-status-badge')).toContainText('Active')
  await expect(page.getByTestId('student-status-badge')).toContainText('Private')

  // Pedagogical Profile card present
  await expect(page.getByTestId('pedagogical-profile-card')).toBeVisible({ timeout: UI_TIMEOUT })

  // Recent sessions empty state (no sessions yet)
  await expect(page.getByTestId('recent-sessions-empty')).toBeVisible({ timeout: UI_TIMEOUT })

  // Teaching notes panel visible with Add Memory button
  await expect(page.getByTestId('teaching-notes-panel')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('add-memory-btn')).toBeVisible()

  // Cleanup
  await page.goto('/students')
  const overviewRow = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName }),
  })
  await overviewRow.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page).toHaveURL(/\/edit$/, { timeout: UI_TIMEOUT })
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })
  await expect(overviewRow).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('commercial fields round-trip: isActive, isCorporate, rate', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `CommercialTest_${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to edit
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Section nav is present
  await expect(page.getByTestId('section-nav')).toBeVisible()

  // Navigate to commercial section via nav link
  await page.getByTestId('section-nav-section-commercial').click()
  await expect(page.getByTestId('toggle-is-active')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('toggle-is-corporate')).toBeVisible()
  await expect(page.getByTestId('student-rate')).toBeVisible()

  // Fill commercial fields - each change triggers autosave
  await page.getByTestId('student-rate').fill('55/hr')
  await page.getByTestId('toggle-is-corporate').click()
  await page.getByTestId('toggle-is-active').click()
  await expect(page.getByTestId('inactive-badge')).toBeVisible()

  // Wait for autosave to complete then navigate via Done button
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Profile tab: commercial section shows updated values
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('profile-commercial')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('profile-commercial')).toContainText('Inactive')
  await expect(page.getByTestId('profile-commercial')).toContainText('Corporate')
  await expect(page.getByTestId('profile-commercial')).toContainText('55/hr')

  // Re-open edit and verify inactive badge persists
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('inactive-badge')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

  // Cleanup via delete button on edit page
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  await context.close()
})

test('sessions tab redesign: timeline, search, status filter, and expand', async ({ browser }) => {
  const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
  const AUTH_HEADER = { Authorization: 'Bearer test-token' }

  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Find Diego Seed who has seeded session logs
  const res = await page.request.get(`${API_BASE}/api/students`, { headers: AUTH_HEADER })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const students: Array<{ name: string; id: string }> = Array.isArray(body) ? body : (body.items ?? body.data ?? [])
  const diego = students.find((s) => s.name === 'Diego Seed')
  if (!diego) throw new Error('Diego Seed not found. Ensure the demo seeder has run.')

  await page.goto(`/students/${diego.id}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })

  // Navigate to Sessions tab
  await page.getByTestId('tab-sessions').click()
  await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

  // Session entries are visible
  const entries = page.getByTestId('session-entry')
  await expect(entries.first()).toBeVisible({ timeout: UI_TIMEOUT })

  // Toolbar is visible
  await expect(page.getByTestId('session-search-input')).toBeVisible()
  await expect(page.getByTestId('status-filter-all')).toBeVisible()
  await expect(page.getByTestId('date-range-button')).toBeVisible()

  // Search: filter by "conditional" — both Diego sessions contain this word, so both should remain
  await page.getByTestId('session-search-input').fill('conditional')
  const filteredEntries = page.getByTestId('session-entry')
  await expect(filteredEntries).toHaveCount(2, { timeout: UI_TIMEOUT })

  // Clear search
  await page.getByTestId('session-search-input').fill('')

  // Status filter: click All (already active, verify it works and both sessions are back)
  await page.getByTestId('status-filter-all').click()
  await expect(page.getByTestId('session-entry')).toHaveCount(2, { timeout: UI_TIMEOUT })

  // Status filter: Cancelled — Diego has no cancelled sessions, so list has 0 entries
  await page.getByTestId('status-filter-cancelled').click()
  await expect(page.getByTestId('session-entry')).toHaveCount(0, { timeout: UI_TIMEOUT })
  // Reset back to All and verify sessions are restored
  await page.getByTestId('status-filter-all').click()
  await expect(page.getByTestId('session-entry')).toHaveCount(2, { timeout: UI_TIMEOUT })

  // Expand first session entry
  const firstEntry = entries.first()
  await firstEntry.getByTestId('session-entry-toggle').click()
  await expect(firstEntry.getByTestId('session-entry-detail')).toBeVisible({ timeout: UI_TIMEOUT })

  // Expanded entry shows edit + delete buttons
  await expect(firstEntry.getByTestId('edit-session-button')).toBeVisible()
  await expect(firstEntry.getByTestId('delete-session-button')).toBeVisible()

  // Collapse by clicking again
  await firstEntry.getByTestId('session-entry-toggle').click()
  await expect(firstEntry.getByTestId('session-entry-detail')).not.toBeVisible()

  await context.close()
})

test('nested learning goal with sub-goal persists after save', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Nested Goals ${Date.now()}`

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })

  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B2' }).click()

  // Add a top-level goal
  await page.getByTestId('learning-goal-add-btn').click()
  await page.getByTestId('learning-goal-top-input').fill('Dominar el subjuntivo')
  await page.keyboard.press('Enter')

  // Add a sub-goal
  await page.getByTestId('learning-goal-add-child-btn').click()
  await page.getByTestId('learning-goal-child-input').fill('Subjuntivo de deseo')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate back to edit and verify structure persists
  await page.goto('/students')
  const studentCard = page.locator('[data-testid^="student-row-"]').filter({
    has: page.getByTestId('student-name').filter({ hasText: studentName })
  })
  await expect(studentCard).toBeVisible({ timeout: UI_TIMEOUT })
  await studentCard.click()
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  await expect(page.getByTestId('learning-goal-text').filter({ hasText: 'Dominar el subjuntivo' })).toBeVisible()
  await expect(page.getByTestId('learning-goal-child-item').getByTestId('learning-goal-text').filter({ hasText: 'Subjuntivo de deseo' })).toBeVisible()

  // Clean up
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  await context.close()
})

test('partial difficulty row shows inline validation error and blocks save', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })

  // Fill required fields
  await page.getByTestId('student-name').fill(`Partial Diff Test ${Date.now()}`)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()

  // Add a difficulty row and fill only description (no competency)
  const addDiffBtn = page.getByTestId('add-difficulty')
  await addDiffBtn.scrollIntoViewIfNeeded()
  await addDiffBtn.click()
  const diffRow = page.getByTestId('difficulty-row').first()
  await expect(diffRow).toBeVisible({ timeout: UI_TIMEOUT })
  await diffRow.getByTestId('difficulty-description').fill('Confuses ser/estar')

  // Attempt to save
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL('/students/new', { timeout: UI_TIMEOUT })

  // Inline error should appear
  await expect(page.getByTestId('difficulty-error')).toBeVisible({ timeout: UI_TIMEOUT })
  await expect(page.getByTestId('difficulty-error')).toContainText('Both type and description are required')

  // Completing the row clears the error
  await diffRow.getByTestId('difficulty-competency').click()
  await page.getByRole('option', { name: 'Grammar' }).click()
  await expect(page.getByTestId('difficulty-error')).not.toBeVisible({ timeout: UI_TIMEOUT })

  await context.close()
})

test('Notes section nav link scrolls to Notes fields', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  const studentName = `NotesNavTest_${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'B1' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to edit
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Click Notes nav link and verify notes fields scroll into the viewport
  await page.getByTestId('section-nav-section-notes').click()
  await expect(page.getByTestId('student-personal-notes')).toBeInViewport({ timeout: FEEDBACK_TIMEOUT })
  await expect(page.getByTestId('student-teaching-notes')).toBeInViewport()

  // Cleanup
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  await context.close()
})

test('Ukrainian native language saves and persists after reload', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `Ukrainian Test ${Date.now()}`

  // Create a student
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: UI_TIMEOUT })
  await page.getByTestId('student-name').fill(studentName)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: 'Spanish' }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: 'A2' }).click()
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })

  // Navigate to edit
  await page.getByTestId('edit-profile-link').click()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: UI_TIMEOUT })

  // Select Ukrainian as native language
  await page.getByTestId('student-native-language').click()
  await page.getByRole('option', { name: 'Ukrainian' }).click()
  await page.keyboard.press('Escape')

  // Wait for autosave to complete without error
  await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })
  await expect(page.getByTestId('autosave-status')).not.toContainText("Couldn't save")

  // Reload and verify chip persists
  await page.reload()
  await expect(page.locator('h1')).toHaveText('Edit Student', { timeout: NAV_TIMEOUT })
  await expect(page.getByTestId('native-lang-chip').filter({ hasText: 'Ukrainian' })).toBeVisible({ timeout: UI_TIMEOUT })

  // Cleanup
  await page.getByTestId('delete-student-btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
  await page.getByTestId('confirm-delete').click()
  await expect(page).toHaveURL('/students', { timeout: UI_TIMEOUT })

  await context.close()
})
