import { test, expect } from '@playwright/test'
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

test('sessions extract: returns structured reflection for a valid student', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: {
      name: `Extract Student ${Date.now()}`,
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
    },
  })
  expect(studentRes.ok()).toBeTruthy()
  const student = await studentRes.json()

  const extractRes = await page.request.post(
    `${API_BASE}/api/students/${student.id}/sessions/extract`,
    {
      headers: AUTH_HEADER,
      data: {
        text: 'We covered ser vs estar. Student struggled with irregular verbs but was enthusiastic.',
      },
    },
  )

  expect(extractRes.ok()).toBeTruthy()
  const body = await extractRes.json()
  expect(body).toHaveProperty('whatWasCovered')
  expect(body).toHaveProperty('areasToImprove')
  expect(body).toHaveProperty('emotionalSignals')
  expect(body).toHaveProperty('homeworkAssigned')
  expect(body).toHaveProperty('nextLessonIdeas')
  expect(body).toHaveProperty('suggestedDifficulties')
  expect(Array.isArray(body.suggestedDifficulties)).toBe(true)

  await context.close()
})

test('sessions extract: returns 404 for student not owned by teacher', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const nonExistentId = '00000000-0000-0000-0000-000000000001'
  const extractRes = await page.request.post(
    `${API_BASE}/api/students/${nonExistentId}/sessions/extract`,
    {
      headers: AUTH_HEADER,
      data: { text: 'Some notes' },
    },
  )

  expect(extractRes.status()).toBe(404)

  await context.close()
})

test('sessions extract: returns 400 for empty text', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  const studentRes = await page.request.post(`${API_BASE}/api/students`, {
    headers: AUTH_HEADER,
    data: {
      name: `Extract Empty ${Date.now()}`,
      learningLanguage: 'Spanish',
      cefrLevel: 'A1',
      interests: [],
    },
  })
  expect(studentRes.ok()).toBeTruthy()
  const student = await studentRes.json()

  const extractRes = await page.request.post(
    `${API_BASE}/api/students/${student.id}/sessions/extract`,
    {
      headers: AUTH_HEADER,
      data: { text: '' },
    },
  )

  expect(extractRes.status()).toBe(400)

  await context.close()
})
