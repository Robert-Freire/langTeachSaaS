import { test, expect, type Page } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const AUTH_HEADER = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function createStudent(page: Page, name: string, cefrLevel = 'B1') {
  const res = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: { name, learningLanguage: 'Spanish', cefrLevel, interests: [] },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

async function createSessionFor(page: Page, studentId: string) {
  const res = await page.request.post(`${API_BASE}/api/students/${studentId}/sessions`, {
    headers: AUTH_HEADER,
    data: { title: 'Sesión previa', sessionDate: new Date().toISOString().slice(0, 10), previousHomeworkStatus: 'NotApplicable' },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

// TC-01: multi-entity proposals from a post-class reflection.
// Fixme'd: requires real LLM extraction; the e2e stack uses stub services that
// return canned data regardless of input. Tracked in #1036.
test.fixme('atelier assistant: TC-01 baseline returns session, student and todo proposals', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Ana Souza TC01-${Date.now()}`)
  const session = await createSessionFor(page, student.id)

  const text =
    'Hoy hemos trabajado el pretérito perfecto. Le cuesta todavía el subjuntivo, especialmente el imperfecto. ' +
    'Súbele el nivel de escritura a B1 porque ha mejorado mucho. ' +
    'Y añade un teaching todo para repasar la voz pasiva la semana que viene.'

  const res = await page.request.post(`${API_BASE}/api/assistant/propose`, {
    headers: AUTH_HEADER,
    data: { text, studentId: student.id, sessionId: session.id },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(Array.isArray(body.proposals)).toBe(true)

  const types = body.proposals.map((p: { type: string }) => p.type)
  expect(types).toContain('session')
  expect(types).toContain('student')
  expect(types).toContain('todo')
  expect(types).not.toContain('newStudent')

  await context.close()
})

// TC-21: "no hay nada que anotar" -> zero proposals.
// Fixme'd: requires real LLM (stub always emits all fields). See #1036.
test.fixme('atelier assistant: TC-21 empty utterance returns zero proposals', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Ana Souza TC21-${Date.now()}`)

  const text = 'Hoy solo hemos tenido tiempo de charlar un poco, no hemos dado nada nuevo. No hay nada que anotar.'

  const res = await page.request.post(`${API_BASE}/api/assistant/propose`, {
    headers: AUTH_HEADER,
    data: { text, studentId: student.id, sessionId: null },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(Array.isArray(body.proposals)).toBe(true)
  expect(body.proposals).toHaveLength(0)

  await context.close()
})

// TC-11: newStudent payload schema with no student context.
// Fixme'd: requires real LLM (stub always emits cefrLevel "B2" + canned name). See #1036.
test.fixme('atelier assistant: TC-11 new-student utterance returns one newStudent proposal with populated payload', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const text =
    'Nueva alumna: Sofía, 28 años, ingeniera, de Madrid. Lengua materna castellano, aprende inglés. ' +
    'Nivel aproximado B1, quiere mejorar para entrevistas de trabajo.'

  const res = await page.request.post(`${API_BASE}/api/assistant/propose`, {
    headers: AUTH_HEADER,
    data: { text, studentId: null, sessionId: null },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const newStudentProposals = body.proposals.filter((p: { type: string }) => p.type === 'newStudent')
  expect(newStudentProposals).toHaveLength(1)

  const payload = newStudentProposals[0].payload
  expect(payload).toBeTruthy()
  expect(payload.name).toBeTruthy()
  expect(payload.cefrLevel).toBe('B1')
  expect(Array.isArray(payload.nativeLanguages)).toBe(true)
  expect(payload.nativeLanguages.length).toBeGreaterThan(0)

  await context.close()
})

// UI: Apply / Dismiss state transitions on a route-mocked /propose response
test('atelier assistant: Apply and Dismiss transition card states without triggering discard banner', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const student = await createStudent(page, `Ana Souza UI-${Date.now()}`)

  // Two proposals: one student (cefrLevel) and one todo
  const proposalsFixture = [
    {
      id: 'mock-student-1',
      type: 'student',
      field: 'cefrLevel',
      label: 'CEFR Level',
      oldValue: 'B1',
      newValue: 'B2',
      payload: null,
    },
    {
      id: 'mock-todo-1',
      type: 'todo',
      field: 'text',
      label: 'Teaching Todo',
      oldValue: null,
      newValue: 'Repasar la voz pasiva',
      payload: null,
    },
  ]

  await page.route('**/api/assistant/propose', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ proposals: proposalsFixture }),
    })
  })

  await page.goto(`/students/${student.id}`)
  await expect(page.locator('[data-testid="student-detail-name"]')).toBeVisible()

  await page.locator('[data-testid="open-assistant-btn"]').first().click()
  await expect(page.locator('[data-testid="assistant-panel"]')).toBeVisible()

  await page.locator('[data-testid="assistant-input"]').fill('test input')
  await page.locator('[data-testid="assistant-send-btn"]').click()

  await expect(page.locator('[data-testid="proposals-list"]')).toBeVisible()

  const studentCard = page.locator(`[data-testid="proposal-card-mock-student-1"]`)
  const todoCard = page.locator(`[data-testid="proposal-card-mock-todo-1"]`)
  await expect(studentCard).toBeVisible()
  await expect(todoCard).toBeVisible()

  // Both pending: each shows Apply + Dismiss
  await expect(studentCard.locator('[data-testid="apply-btn-mock-student-1"]')).toBeVisible()
  await expect(todoCard.locator('[data-testid="apply-btn-mock-todo-1"]')).toBeVisible()

  // Dismiss the first card -> Dismissed badge, second card unchanged
  await studentCard.locator('[data-testid="dismiss-btn-mock-student-1"]').click()
  await expect(studentCard).toContainText(/Dismissed/i)
  await expect(studentCard.locator('[data-testid="apply-btn-mock-student-1"]')).toHaveCount(0)
  await expect(todoCard.locator('[data-testid="apply-btn-mock-todo-1"]')).toBeVisible()

  // Apply the second card -> Applied badge
  await todoCard.locator('[data-testid="apply-btn-mock-todo-1"]').click()
  await expect(todoCard).toContainText(/Applied/i)

  // No discard confirm should appear (all cards resolved)
  await expect(page.locator('[data-testid="discard-confirm"]')).toHaveCount(0)

  await context.close()
})
