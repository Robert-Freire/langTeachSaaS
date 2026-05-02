/**
 * Atelier Assistant proposal extraction quality tests.
 *
 * Real Auth0 plus real Claude API. Mirrors the teacher-qa pattern (sequential,
 * 10-minute test timeout, screenshots on failure). NOT for CI: the suite
 * exercises real LLM calls and persistent QA data.
 *
 * Run via:
 *   npx playwright test tests/atelier-assistant.spec.ts --config playwright.config.ts
 *
 * Cases mirror Layer 1 of issue #1035. Test 1 and Test 4 depend on the
 * SkillLevelOverrides proposal type (#1039) and the profile-update append
 * proposals (#1040) being wired up. Until those merge they are expected
 * to fail.
 */
import { test, expect, type Page } from '@playwright/test'
import { createQAAuthContext } from '../helpers/auth'
import { upsertStudent } from '../helpers/navigation'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'

interface ProposalDto {
  id: string
  type: 'student' | 'session' | 'todo' | 'newStudent' | 'newSession'
  field: string
  label: string
  oldValue: string | null
  newValue: string
  payload: Record<string, unknown> | null
}

// API calls go through the page context so the React auth interceptor (Auth0)
// attaches the Bearer token. The frontend on 5175 reverse-proxies /api to 5176.
async function apiCall<T>(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const auth0KeyPrefix = '@@auth0spajs@@'
      const cacheKey = Object.keys(localStorage).find(
        k => k.startsWith(auth0KeyPrefix) && !k.endsWith('::@@user@@'),
      )
      if (!cacheKey) throw new Error('Auth0 token cache key not found')
      const raw = localStorage.getItem(cacheKey)
      if (!raw) throw new Error('Auth0 token cache empty')
      const parsed = JSON.parse(raw)
      const token = parsed?.body?.access_token
      if (!token) throw new Error('No access_token in Auth0 cache')

      const res = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${method} ${path} failed: ${res.status} ${text}`)
      }
      if (res.status === 204) return null as unknown as T
      return res.json() as Promise<T>
    },
    { method, path, body },
  )
}

async function propose(
  page: Page,
  text: string,
  studentId: string | null,
  sessionId: string | null,
): Promise<ProposalDto[]> {
  const body = await apiCall<{ proposals: ProposalDto[] }>(page, 'POST', '/api/assistant/propose', {
    text,
    studentId,
    sessionId,
  })
  return body.proposals
}

async function mostRecentSessionId(page: Page, studentId: string): Promise<string | null> {
  try {
    const body = await apiCall<{ items?: Array<{ id: string }> } | Array<{ id: string }>>(
      page,
      'GET',
      `/api/students/${studentId}/sessions`,
    )
    const items = Array.isArray(body) ? body : body.items
    if (!items || items.length === 0) return null
    return items[0].id ?? null
  } catch {
    return null
  }
}

async function ensureSessionFor(page: Page, studentId: string): Promise<string> {
  const existing = await mostRecentSessionId(page, studentId)
  if (existing) return existing
  const created = await apiCall<{ id: string }>(page, 'POST', `/api/students/${studentId}/sessions`, {
    title: '[QA] Sesión previa',
    sessionDate: new Date().toISOString().slice(0, 10),
    previousHomeworkStatus: 'NotApplicable',
  })
  return created.id
}

const ANA = {
  name: '[QA] Ana Proposal',
  language: 'Spanish',
  cefrLevel: 'B1',
  nativeLanguage: 'Portuguese',
}

// Test \1: TC-01 baseline: multi-entity proposals
test('atelier assistant: TC-01 baseline returns session, student and todo proposals', async ({ browser }) => {
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  const studentId = await upsertStudent(page, ANA)
  const sessionId = await ensureSessionFor(page, studentId)

  const proposals = await propose(
    page,
    'Hoy hemos trabajado el pretérito perfecto. Le cuesta todavía el subjuntivo, especialmente el imperfecto. Súbele el nivel de escritura a B1 porque ha mejorado mucho. Y añade un teaching todo para repasar la voz pasiva la semana que viene.',
    studentId,
    sessionId,
  )

  const types = proposals.map(p => p.type)
  expect(types).toContain('session')
  expect(types).toContain('student')
  expect(types).toContain('todo')
  expect(types).not.toContain('newStudent')

  await context.close()
})

// Test \1: TC-21 empty result: no proposals for "nothing to log"
test('atelier assistant: TC-21 empty utterance returns zero proposals', async ({ browser }) => {
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  const studentId = await upsertStudent(page, ANA)

  const proposals = await propose(
    page,
    'Hoy solo hemos tenido tiempo de charlar un poco, no hemos dado nada nuevo. No hay nada que anotar.',
    studentId,
    null,
  )
  expect(proposals).toHaveLength(0)

  await context.close()
})

// Test \1: TC-11 new student schema
test('atelier assistant: TC-11 new-student utterance returns one newStudent proposal with populated payload', async ({ browser }) => {
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // Navigate to /students before posting so any subsequent UI side-effects (cache) are warm
  await page.goto(`${BASE_URL}/students`)

  const proposals = await propose(
    page,
    'Nueva alumna: Sofía, 28 años, ingeniera, de Madrid. Lengua materna castellano, aprende inglés. Nivel aproximado B1, quiere mejorar para entrevistas de trabajo.',
    null,
    null,
  )

  const newStudent = proposals.filter(p => p.type === 'newStudent')
  expect(newStudent).toHaveLength(1)

  const payload = newStudent[0].payload as { name?: string; cefrLevel?: string; nativeLanguages?: string[] }
  expect(payload).toBeTruthy()
  expect(payload.name).toBeTruthy()
  expect(payload.cefrLevel).toBe('B1')
  expect(Array.isArray(payload.nativeLanguages)).toBe(true)
  expect(payload.nativeLanguages!.length).toBeGreaterThan(0)

  await context.close()
})

// Test 4: Apply student proposal patches the student; Dismiss todo creates no followup
test('atelier assistant: Apply student card patches skill level; Dismiss todo creates no followup', async ({ browser }) => {
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // Fresh per-run student. The controller dedups proposals when oldValue
  // matches newValue, so reusing the persistent [QA] Ana Proposal across
  // runs would yield no skillLevel.writing proposal once Writing is B1.
  const studentId = await upsertStudent(page, {
    ...ANA,
    name: `[QA] Ana Apply ${Date.now()}`,
  })
  const sessionId = await ensureSessionFor(page, studentId)

  type Todo = { id: string }
  // Teaching todos are exposed via student.profile.teachingTodos; the
  // POST /students/{id}/teaching-todos endpoint creates one but does not list.
  const fetchTodoCount = async () => {
    const s = await apiCall<{ profile: { teachingTodos: Todo[] } }>(
      page,
      'GET',
      `/api/students/${studentId}`,
    )
    return s.profile.teachingTodos.length
  }
  const initialTodoCount = await fetchTodoCount()

  const proposals = await propose(
    page,
    'Hoy hemos trabajado el pretérito perfecto. Le cuesta todavía el subjuntivo, especialmente el imperfecto. Súbele el nivel de escritura a B1 porque ha mejorado mucho. Y añade un teaching todo para repasar la voz pasiva la semana que viene.',
    studentId,
    sessionId,
  )

  const studentProposal = proposals.find(
    p => p.type === 'student' && p.field === 'skillLevel.writing',
  )
  const todoProposal = proposals.find(p => p.type === 'todo')
  expect(studentProposal, 'expected a skillLevel.writing student proposal').toBeTruthy()
  expect(todoProposal, 'expected at least one todo proposal').toBeTruthy()
  expect(studentProposal!.newValue).toBe('B1')

  // Mirror the frontend transform from frontend/src/api/assistant.ts:
  // a "skillLevel.<key>" proposal field becomes the "skillLevel<Key>" PATCH key.
  const patchBody: Record<string, string> = {}
  if (studentProposal!.field.startsWith('skillLevel.')) {
    const subKey = studentProposal!.field.split('.')[1]
    const patchField = 'skillLevel' + subKey.charAt(0).toUpperCase() + subKey.slice(1)
    patchBody[patchField] = studentProposal!.newValue
  } else {
    patchBody[studentProposal!.field] = studentProposal!.newValue
  }
  await apiCall(page, 'PATCH', `/api/students/${studentId}`, patchBody)

  const student = await apiCall<{
    level: { skillLevelOverrides: Record<string, string> }
  }>(page, 'GET', `/api/students/${studentId}`)
  // Dictionary key may be Writing or writing depending on serializer config;
  // accept either case.
  const overrides = student.level.skillLevelOverrides
  const writingValue =
    Object.entries(overrides).find(([k]) => k.toLowerCase() === 'writing')?.[1]
  expect(writingValue).toBe('B1')

  // Dismissing a todo card is a frontend-only state change; no API call.
  // Verify no extra teaching todo was created.
  expect(await fetchTodoCount()).toBe(initialTodoCount)

  await context.close()
})
