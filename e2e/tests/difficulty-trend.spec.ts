import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

const createdStudentIds: string[] = []

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test.afterAll(async ({ browser }) => {
  if (createdStudentIds.length === 0) return
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()
  for (const id of createdStudentIds) {
    await page.request.delete(`${API_BASE}/api/students/${id}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
  }
  await page.close()
  await context.close()
})

test('trend starts stable with no session logs', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `[QA] Trend Test Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
      ],
      notes: null,
    },
  })
  expect(createRes.status()).toBe(201)
  const student = await createRes.json()
  createdStudentIds.push(student.id)
  expect(student.difficulties[0].trend).toBe('stable')

  await context.close()
})

test('trend becomes worsening after 3 consecutive session logs mentioning pair', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `[QA] Worsening Trend Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
      ],
      notes: null,
    },
  })
  const student = await createRes.json()
  const studentId = student.id
  createdStudentIds.push(studentId)

  // Create 3 session logs, each mentioning the Grammar/ser/estar pair
  for (let i = 0; i < 3; i++) {
    const sessionRes = await page.request.post(`${API_BASE}/api/students/${studentId}/sessions`, {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: {
        sessionDate: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        previousHomeworkStatus: 'NotApplicable',
        isCancelled: false,
        mentionedDifficultyPairs: [{ Competency: 'Grammar', Subcategory: 'ser/estar' }],
      },
    })
    expect(sessionRes.status()).toBe(201)
  }

  // Fetch student to check updated trend
  const updatedRes = await page.request.get(`${API_BASE}/api/students/${studentId}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const updated = await updatedRes.json()
  expect(updated.difficulties[0].trend).toBe('worsening')

  await context.close()
})

test('covered difficulty becomes improving when not mentioned in last 2 sessions', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `[QA] Improving Trend Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'False cognates', competency: 'Vocabulary', subcategory: 'false friends', severity: 'medium', trend: 'stable', status: 'Covered' },
      ],
      notes: null,
    },
  })
  const student = await createRes.json()
  const studentId = student.id
  createdStudentIds.push(studentId)

  // Create 2 session logs NOT mentioning the pair
  for (let i = 0; i < 2; i++) {
    const sessionRes = await page.request.post(`${API_BASE}/api/students/${studentId}/sessions`, {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: {
        sessionDate: new Date(Date.now() - (2 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        previousHomeworkStatus: 'NotApplicable',
        isCancelled: false,
        mentionedDifficultyPairs: [],
      },
    })
    expect(sessionRes.status()).toBe(201)
  }

  // Fetch student to check updated trend
  const updatedRes = await page.request.get(`${API_BASE}/api/students/${studentId}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  const updated = await updatedRes.json()
  expect(updated.difficulties[0].trend).toBe('improving')

  await context.close()
})

test('session log dialog shows active difficulties checkboxes', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentName = `[QA] Dialog Difficulties Student ${Date.now()}`
  const createRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
        { id: 'd2', description: 'False cognates', competency: 'Vocabulary', subcategory: 'false friends', severity: 'medium', trend: 'stable', status: 'Covered' },
      ],
      notes: null,
    },
  })
  const student = await createRes.json()
  const studentId = student.id
  createdStudentIds.push(studentId)

  await page.goto(`/students/${studentId}`)
  await page.getByRole('button', { name: 'Log Session' }).click()

  // Only Active difficulties should appear as checkboxes
  await expect(page.getByTestId('mentioned-difficulty-Grammar-ser/estar')).toBeVisible()
  // Covered difficulty should NOT appear
  await expect(page.getByTestId('mentioned-difficulty-Vocabulary-false friends')).not.toBeAttached()

  await context.close()
})

test('taxonomy: Interaction and Mediation competencies accepted; Fluency rejected; critical severity accepted', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const base = {
    name: `[QA] Taxonomy Test ${Date.now()}`,
    learningLanguage: 'Spanish',
    cefrLevel: 'B1',
    interests: [],
    learningGoals: [],
    weaknesses: [],
    notes: null,
  }

  // Interaction + critical severity must be accepted
  const interactionRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      ...base,
      difficulties: [
        { id: 'i1', description: 'Struggles with turn-taking in discussions', competency: 'Interaction', subcategory: 'turn-taking', severity: 'critical', trend: 'stable', status: 'Active' },
      ],
    },
  })
  expect(interactionRes.status()).toBe(201)
  const interactionStudent = await interactionRes.json()
  createdStudentIds.push(interactionStudent.id)
  expect(interactionStudent.difficulties[0].competency).toBe('Interaction')
  expect(interactionStudent.difficulties[0].severity).toBe('critical')

  // Mediation competency must be accepted
  const mediationRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      ...base,
      difficulties: [
        { id: 'm1', description: 'Cannot summarise texts for others', competency: 'Mediation', subcategory: 'summarising', severity: 'medium', trend: 'stable', status: 'Active' },
      ],
    },
  })
  expect(mediationRes.status()).toBe(201)
  const mediationStudent = await mediationRes.json()
  createdStudentIds.push(mediationStudent.id)
  expect(mediationStudent.difficulties[0].competency).toBe('Mediation')

  // Fluency competency must be rejected (removed from taxonomy)
  const fluencyRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      ...base,
      difficulties: [
        { id: 'f1', description: 'Speaks too slowly', competency: 'Fluency', subcategory: 'speed', severity: 'low', trend: 'stable', status: 'Active' },
      ],
    },
  })
  expect(fluencyRes.status()).toBe(400)

  await context.close()
})
