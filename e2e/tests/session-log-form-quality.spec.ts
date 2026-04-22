import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { NAV_TIMEOUT, UI_TIMEOUT, FEEDBACK_TIMEOUT } from '../helpers/timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('log session form quality: topics covered visible without secondary, suggestion chips appear, title auto-generated', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Form Quality Test ${Date.now()}`
    const createRes = await page.request.post(`${API_BASE}/api/students`, {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: {
        name: studentName,
        learningLanguage: 'Spanish',
        cefrLevel: 'B2',
        interests: [],
        learningGoals: [],
        weaknesses: [],
        difficulties: [],
      },
    })
    expect(createRes.ok()).toBeTruthy()
    const student = await createRes.json()

    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Topics Covered is visible without toggling secondary
    await expect(page.getByTestId('topics-covered-section')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Duration defaults to 60
    await expect(page.getByTestId('duration-select')).toContainText('60')

    // Type a narrative containing a known keyword
    const narrative = 'Revisamos el uso del subjuntivo en oraciones temporales y el imperfecto'
    await page.getByTestId('actual-content').fill(narrative)

    // Suggestion chips appear for matched keywords
    await expect(page.getByTestId('topic-tag-suggestions')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })
    await expect(page.getByTestId('tag-suggestion-subjuntivo')).toBeVisible()
    await expect(page.getByTestId('tag-suggestion-imperfecto')).toBeVisible()

    // Accept the first suggestion chip
    await page.getByTestId('tag-suggestion-subjuntivo').click()

    // subjuntivo chip should no longer appear in suggestions (already added)
    await expect(page.getByTestId('tag-suggestion-subjuntivo')).not.toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Autosave completes
    await expect(page.getByTestId('autosave-status')).toContainText('All changes saved', { timeout: UI_TIMEOUT })

    // Click Done to save and navigate back
    await page.getByTestId('done-btn').click()
    await expect(page).toHaveURL(new RegExp(`/students/${student.id}$`), { timeout: UI_TIMEOUT })

    // Verify session was created with auto-generated title (from first line of narrative)
    const sessionsRes = await page.request.get(`${API_BASE}/api/students/${student.id}/sessions`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(sessionsRes.ok()).toBeTruthy()
    const sessions = await sessionsRes.json()
    expect(sessions.length).toBeGreaterThan(0)
    const session = sessions[0]
    // Title auto-generated from narrative first line
    expect(session.title).toBeTruthy()
    expect(session.title).not.toBe('')
    // Topic tag accepted from suggestion chip
    const tags = JSON.parse(session.topicTags)
    expect(tags.some((t: { tag: string }) => t.tag === 'subjuntivo')).toBe(true)
  } finally {
    await context.close()
  }
})

test('audio recorder visible on log session page without toggling secondary', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  try {
    const studentName = `Audio Visible Test ${Date.now()}`
    const createRes = await page.request.post(`${API_BASE}/api/students`, {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: {
        name: studentName,
        learningLanguage: 'Spanish',
        cefrLevel: 'B1',
        interests: [],
        learningGoals: [],
        weaknesses: [],
        difficulties: [],
      },
    })
    expect(createRes.ok()).toBeTruthy()
    const student = await createRes.json()

    await page.goto(`/students/${student.id}/log-session`)
    await expect(page.getByTestId('log-session-page')).toBeVisible({ timeout: NAV_TIMEOUT })

    // Voice recorder section visible without any toggle interaction
    await expect(page.getByTestId('voice-recorder-section')).toBeVisible({ timeout: FEEDBACK_TIMEOUT })

    // Toggle button shows descriptor text
    await expect(page.getByTestId('toggle-secondary')).toContainText('Show homework, cultural notes, error patterns...')
  } finally {
    await context.close()
  }
})
