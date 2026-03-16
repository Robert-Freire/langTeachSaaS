import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { mockAiStream, CONVERSATION_FIXTURE } from '../helpers/mock-ai-stream'
import { TEST_TIMEOUT, NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('conversation type renders editor and student view', async ({ browser }) => {
  test.setTimeout(TEST_TIMEOUT)
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    // Mock the AI stream before navigating
    await mockAiStream(page, CONVERSATION_FIXTURE)

    // Create a lesson via the wizard
    await page.goto('/lessons')
    await expect(page.locator('h1')).toHaveText('Lessons', { timeout: NAV_TIMEOUT })
    await page.getByTestId('new-lesson-btn').click()
    await expect(page.locator('h1')).toHaveText('New Lesson', { timeout: UI_TIMEOUT })

    // Pick any template (WarmUp defaults to conversation)
    await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: UI_TIMEOUT })
    await page.getByTestId('template-grammar-focus').click()

    // Fill in lesson metadata
    await expect(page.locator('h1')).toHaveText('Lesson Details', { timeout: UI_TIMEOUT })
    const lessonTitle = `Conversation Type Test ${Date.now()}`
    await page.getByTestId('input-title').fill(lessonTitle)

    await page.getByTestId('select-language').click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.getByTestId('select-level').click()
    await page.getByRole('option', { name: 'B1' }).click()

    await page.getByTestId('input-topic').fill('Restaurant ordering')

    await page.getByTestId('select-duration').click()
    await page.getByRole('option', { name: '45 min' }).click()

    await page.getByTestId('submit-lesson').click()

    // Should be on lesson editor
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+$/, { timeout: UI_TIMEOUT })
    await expect(page.getByTestId('lesson-title')).toHaveText(lessonTitle, { timeout: UI_TIMEOUT })

    // Save WarmUp section notes so section exists in DB (required for generate button to be active)
    const warmupSection = page.getByTestId('section-warmup')
    await warmupSection.fill('Practice ordering food at a restaurant.')
    await warmupSection.blur()
    await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Open the generate panel for WarmUp (defaults to conversation type)
    await page.getByTestId('generate-btn-warmup').click()
    await expect(page.getByTestId('generate-panel')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Trigger generation
    await page.getByTestId('generate-btn').click()

    // Wait for streaming to complete
    await page.getByTestId('insert-btn').waitFor({ state: 'visible', timeout: FEEDBACK_TIMEOUT })

    // Insert into section
    await page.getByTestId('insert-btn').click()

    // Generate panel should close and content block appear
    await expect(page.getByTestId('generate-panel')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('ai-block-badge').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Conversation should render as structured editor (not raw JSON)
    await expect(page.getByTestId('conversation-editor').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Navigate to student study view
    await page.getByTestId('preview-student-btn').click()
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]+\/study$/, { timeout: UI_TIMEOUT })

    // Student view should show conversation renderer
    await expect(page.getByTestId('conversation-student').first()).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Setup text should be visible
    await expect(page.getByText('You are at a restaurant and want to order food.')).toBeVisible({ timeout: UI_TIMEOUT })

    // T15.4a: instruction header
    await expect(page.getByText('Practice with a partner:')).toBeVisible({ timeout: UI_TIMEOUT })

    // Role A is selected by default — Your Phrases visible immediately
    await expect(page.getByTestId('student-role-a-0')).toContainText('(You)')
    await expect(page.getByTestId('student-role-b-0')).toContainText('(Partner)')
    await expect(page.getByText('Your Phrases')).toBeVisible({ timeout: UI_TIMEOUT })
    await expect(page.getByText('Here is your table.')).toBeVisible({ timeout: UI_TIMEOUT })

    // T15.4a: switch to Role B (Customer)
    await page.getByTestId('student-role-b-0').click()
    await expect(page.getByTestId('student-role-b-0')).toContainText('(You)')
    await expect(page.getByTestId('student-role-a-0')).toContainText('(Partner)')

    // Customer (roleB) phrases now shown as "Your Phrases"
    await expect(page.getByText("I'd like to order...")).toBeVisible({ timeout: UI_TIMEOUT })

    // Waiter (roleA) phrases shown dimmed as partner's
    await expect(page.getByText('Here is your table.')).toBeVisible({ timeout: UI_TIMEOUT })

    // T15.4a: phrase toggle — tap first "Your Phrases" chip
    const phraseChip = page.getByTestId('student-phrase-chip-0-0')
    await expect(phraseChip).toBeVisible({ timeout: UI_TIMEOUT })
    await phraseChip.click()
    await expect(phraseChip).toHaveClass(/line-through/)
    await expect(phraseChip).toContainText('✓')

    // Tap again to uncheck — both class and checkmark must clear
    await phraseChip.click()
    await expect(phraseChip).not.toHaveClass(/line-through/)
    await expect(phraseChip).not.toContainText('✓')
  } finally {
    await context.close()
  }
})
