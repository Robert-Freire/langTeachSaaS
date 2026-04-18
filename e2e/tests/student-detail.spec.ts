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

test('student detail overview tab: three-card row renders in correct order', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Navigate to students list and click Ana Seed (rich-profile scenario)
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

    const anaSeed = page.getByText('Ana Seed').first()
    await expect(anaSeed).toBeVisible({ timeout: UI_TIMEOUT })
    await anaSeed.click()

    // Should land on student detail
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    // Three-card row exists
    const threeCardRow = page.getByTestId('three-card-row')
    await expect(threeCardRow).toBeVisible({ timeout: UI_TIMEOUT })

    // Followups card, Profile card, Ideas card are all present
    await expect(threeCardRow.getByTestId('followups-card-wrapper')).toBeVisible()
    await expect(threeCardRow.getByTestId('pedagogical-profile-card')).toBeVisible()
    await expect(threeCardRow.getByTestId('ideas-card-wrapper')).toBeVisible()

    // Followups is the first child (DOM order)
    const followupsBox = await threeCardRow.getByTestId('followups-card-wrapper').boundingBox()
    const profileBox = await threeCardRow.getByTestId('pedagogical-profile-card').boundingBox()
    const ideasBox = await threeCardRow.getByTestId('ideas-card-wrapper').boundingBox()
    expect(followupsBox!.x).toBeLessThan(profileBox!.x)
    expect(profileBox!.x).toBeLessThan(ideasBox!.x)

    // Language tags row shows target language
    await expect(threeCardRow.getByTestId('language-tags')).toBeVisible()
    await expect(threeCardRow.getByTestId('target-language-tag')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('student detail overview tab: compact session cards and view-all link', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Diego Seed has 2 session log entries
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

    const diegoSeed = page.getByText('Diego Seed').first()
    await expect(diegoSeed).toBeVisible({ timeout: UI_TIMEOUT })
    await diegoSeed.click()

    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    // Recent sessions section exists
    const recentSessions = page.getByTestId('recent-sessions')
    await expect(recentSessions).toBeVisible({ timeout: UI_TIMEOUT })

    // Compact session items visible (at most 2)
    const sessionItems = recentSessions.getByTestId('recent-session-item')
    const count = await sessionItems.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(2)

    // View all sessions link is visible
    await expect(page.getByTestId('view-all-sessions-btn')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('student detail overview tab: + Ideas button opens inline input', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Create a fresh student with no todos so the + button is the only trigger
    const studentName = `Ideas Button Test ${Date.now()}`
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
    await page.getByTestId('student-name').fill(studentName)
    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()
    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'A1' }).click()
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Save Student' }).click()

    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    // The + button in the Ideas card header should be visible
    await expect(page.getByTestId('ideas-add-header-btn')).toBeVisible({ timeout: UI_TIMEOUT })

    // Before clicking: add input should NOT be visible (controlled mode, showAddForm=false)
    await expect(page.getByTestId('todo-add-input')).not.toBeVisible()

    // Click + to reveal the inline input
    await page.getByTestId('ideas-add-header-btn').click()
    await expect(page.getByTestId('todo-add-input')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student detail overview tab: Followups card amber when pending followups exist', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Create student, add followup from profile tab, verify amber on overview
    const studentName = `Amber Followup Test ${Date.now()}`
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
    await page.getByTestId('student-name').fill(studentName)
    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()
    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'A1' }).click()
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Save Student' }).click()

    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    // Navigate to Overview tab and verify neutral background (no followups yet)
    await page.getByTestId('tab-overview').click()
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })
    const wrapperNeutral = page.getByTestId('followups-card-wrapper')
    const neutralClass = await wrapperNeutral.getAttribute('class')
    expect(neutralClass).not.toContain('FFF9F2')

    // Add a followup from Profile tab
    await page.getByTestId('tab-profile').click()
    const followupText = `Test followup ${Date.now()}`
    await expect(page.getByTestId('followup-input')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('followup-input').fill(followupText)
    await page.getByTestId('followup-add-btn').click()
    await expect(page.getByText(followupText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Go back to Overview — Followups card should now be amber
    await page.getByTestId('tab-overview').click()
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })
    const wrapperAmber = page.getByTestId('followups-card-wrapper')
    const amberClass = await wrapperAmber.getAttribute('class')
    expect(amberClass).toContain('FFF9F2')
  } finally {
    await context.close()
  }
})

test('student detail profile tab: inline-add learning goal', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Navigate to Ana Visual (has minimal profile data, no learning goals)
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    const anaVisual = page.getByText('Ana Visual').first()
    await expect(anaVisual).toBeVisible({ timeout: UI_TIMEOUT })
    await anaVisual.click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    // Switch to Profile tab
    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    // Click + button on Learning Goals section
    await expect(page.getByTestId('goal-add-btn')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('goal-add-btn').click()

    // Inline input appears
    const goalInput = page.getByTestId('goal-add-btn-input')
    await expect(goalInput).toBeVisible({ timeout: UI_TIMEOUT })

    // Type a new goal and press Enter
    const goalText = `E2E goal ${Date.now()}`
    await goalInput.fill(goalText)
    await goalInput.press('Enter')

    // New goal appears in the list
    await expect(page.getByText(goalText)).toBeVisible({ timeout: UI_TIMEOUT })

    // Input is closed
    await expect(page.getByTestId('goal-add-btn-input')).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('student detail profile tab: inline-add short-term objective', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    const anaVisual = page.getByText('Ana Visual').first()
    await expect(anaVisual).toBeVisible({ timeout: UI_TIMEOUT })
    await anaVisual.click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('objective-add-btn')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('objective-add-btn').click()

    const objInput = page.getByTestId('objective-add-btn-input')
    await expect(objInput).toBeVisible({ timeout: UI_TIMEOUT })

    const objText = `E2E objective ${Date.now()}`
    await objInput.fill(objText)
    await objInput.press('Enter')

    await expect(page.getByText(objText)).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('objective-add-btn-input')).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('student detail progress tab: renders without errors', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })

    const anaSeed = page.getByText('Ana Seed').first()
    await expect(anaSeed).toBeVisible({ timeout: UI_TIMEOUT })
    await anaSeed.click()

    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })
    await expect(page.getByTestId('student-overview-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('tab-progress').click()
    await expect(page.getByTestId('progress-tab-content')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('skill-imbalance-section')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('pacing-section')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student detail profile tab: inline-add focus area difficulty', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    const anaVisual = page.getByText('Ana Visual').first()
    await expect(anaVisual).toBeVisible({ timeout: UI_TIMEOUT })
    await anaVisual.click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('difficulty-add-btn')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('difficulty-add-btn').click()

    await expect(page.getByTestId('difficulty-add-competency')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('difficulty-add-competency').fill('Pronunciation')

    const descText = `E2E difficulty ${Date.now()}`
    await page.getByTestId('difficulty-add-description').fill(descText)
    await page.getByTestId('difficulty-add-description').press('Enter')

    await expect(page.getByText(descText)).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('difficulty-add-description')).not.toBeVisible()
  } finally {
    await context.close()
  }
})

// ----- t771: interaction standard -----

test('student profile tab: motivation autosave on blur', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Ana Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('reason-edit-trigger').click()
    const textarea = page.getByTestId('reason-textarea')
    await expect(textarea).toBeVisible({ timeout: UI_TIMEOUT })

    await textarea.fill('Autosave e2e test reason')
    await textarea.blur()

    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student profile tab: motivation Escape reverts value', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Ana Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('reason-edit-trigger').click()
    const textarea = page.getByTestId('reason-textarea')
    await expect(textarea).toBeVisible({ timeout: UI_TIMEOUT })

    await textarea.fill('Should not be saved')
    await textarea.press('Escape')

    // After escape, edit mode exits and original quote is visible
    await expect(page.getByTestId('reason-quote')).toBeVisible({ timeout: UI_TIMEOUT })
    // SavedIndicator should NOT appear — use toHaveCount(0) to avoid race with deferred mount
    await expect(page.getByTestId('saved-indicator')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('student profile tab: interests chip input always visible', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Ana Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('interests-input')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student profile tab: add interest chip via Enter', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    const studentName = `Interests E2E ${Date.now()}`
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
    await page.getByTestId('student-name').fill(studentName)
    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()
    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'A1' }).click()
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Save Student' }).click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    const input = page.getByTestId('interests-input')
    await expect(input).toBeVisible({ timeout: UI_TIMEOUT })
    await input.fill('reading')
    await input.press('Enter')

    await expect(page.getByTestId('interest-tag').filter({ hasText: 'reading' })).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('student profile tab: TWM always visible without show-all', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    const studentName = `TWM Visibility ${Date.now()}`
    await page.goto('/students/new')
    await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
    await page.getByTestId('student-name').fill(studentName)
    await page.getByTestId('student-language').click()
    await page.getByRole('option', { name: 'Spanish' }).click()
    await page.getByTestId('student-cefr').click()
    await page.getByRole('option', { name: 'A1' }).click()
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: 'English' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Save Student' }).click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-profile').click()
    await expect(page.getByTestId('student-profile-tab')).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('profile-about')).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sessions tab: no kebab menu on session rows', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Diego Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-sessions').click()
    await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('session-kebab-trigger')).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('sessions tab: expand row shows editable title and narrative inputs', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Diego Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-sessions').click()
    await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('session-entry-toggle').first().click()
    await expect(page.getByTestId('session-entry-detail').first()).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('session-title-input').first()).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('session-narrative-input').first()).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByTestId('session-duration-input').first()).toBeVisible({ timeout: UI_TIMEOUT })
  } finally {
    await context.close()
  }
})

test('sessions tab: expanded row has delete button that opens confirmation dialog', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Diego Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-sessions').click()
    await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('session-entry-toggle').first().click()
    await expect(page.getByTestId('session-entry-detail').first()).toBeVisible({ timeout: UI_TIMEOUT })

    await expect(page.getByTestId('delete-session-btn').first()).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('delete-session-btn').first().click()
    await expect(page.getByText('Delete this session?')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Delete this session?')).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('sessions tab: expanded row has "Edit full session" link that navigates to log-session with sessionId', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  try {
    await page.goto('/students')
    await expect(page.locator('h1')).toHaveText('Students', { timeout: NAV_TIMEOUT })
    await page.getByText('Diego Seed').first().click()
    await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: NAV_TIMEOUT })

    await page.getByTestId('tab-sessions').click()
    await expect(page.getByTestId('session-history-list')).toBeVisible({ timeout: UI_TIMEOUT })

    await page.getByTestId('session-entry-toggle').first().click()
    await expect(page.getByTestId('session-entry-detail').first()).toBeVisible({ timeout: UI_TIMEOUT })

    const editLink = page.getByTestId('edit-full-session-link').first()
    await expect(editLink).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(editLink).toHaveAttribute('href', /\/students\/[^/]+\/sessions\/[^/]+\/edit$/)

    await editLink.click()
    await expect(page).toHaveURL(/\/students\/[^/]+\/sessions\/[^/]+\/edit$/, { timeout: NAV_TIMEOUT })
  } finally {
    await context.close()
  }
})
