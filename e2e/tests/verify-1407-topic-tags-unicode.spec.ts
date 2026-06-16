import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT, AI_STREAM_TIMEOUT } from '../helpers/timeouts'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

// Issue #1407 — Topic tags proposal must not show unicode escapes
// When the assistant extracts topic tags with Spanish accented characters,
// the proposal card must display them literally (e.g. pretérito perfecto),
// not as unicode escape sequences (e.g. pretérito).

test('assistant: topic tags proposal with accented characters shows literal chars, not unicode escapes', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: NAV_TIMEOUT })

    // Navigate to a student page so the assistant button is enabled
    const studentLink = page.getByRole('link', { name: /Petra Seed/i }).first()
    await expect(studentLink).toBeVisible({ timeout: UI_TIMEOUT })
    await studentLink.click()
    await expect(page.locator('h1')).toContainText('Petra', { timeout: NAV_TIMEOUT })

    // Open the assistant panel
    const fabBtn = page.getByTestId('open-assistant-btn')
    await expect(fabBtn).toBeVisible({ timeout: UI_TIMEOUT })
    await fabBtn.click()

    const panel = page.getByTestId('assistant-panel')
    await expect(panel).toBeVisible({ timeout: UI_TIMEOUT })

    // Send a transcription that forces accented topic tags
    const input = panel.getByTestId('assistant-input')
    await input.fill('en la sesion de hoy a las 16:00 hemos hablado de la universidad y de su infancia hemos trabajado el preterito perfecto')
    await panel.getByTestId('assistant-send-btn').click()

    // Wait for proposals to appear
    await expect(page.getByTestId(/^proposal-card-/).first()).toBeVisible({ timeout: AI_STREAM_TIMEOUT })

    // Find the topicTags proposal card and check its text content
    const proposalCards = page.getByTestId(/^proposal-card-/)
    const count = await proposalCards.count()

    let topicTagsText = ''
    for (let i = 0; i < count; i++) {
      const card = proposalCards.nth(i)
      const cardText = await card.innerText()
      if (cardText.includes('TOPIC TAGS') || cardText.includes('Topic Tags')) {
        topicTagsText = cardText
        break
      }
    }

    expect(topicTagsText).not.toBe('')
    expect(topicTagsText).not.toContain('\\u00')
    expect(topicTagsText).not.toContain('\\u00e9')
    expect(topicTagsText).not.toContain('\\u00f3')
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
})
