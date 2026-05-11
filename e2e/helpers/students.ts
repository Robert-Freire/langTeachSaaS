import { Page, expect } from '@playwright/test'
import { NAV_TIMEOUT, UI_TIMEOUT } from './timeouts'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

export interface CreateStudentUIOptions {
  name: string
  language: string
  cefrLevel: string
  nativeLanguage?: string
}

export async function createStudentViaUI(
  page: Page,
  options: CreateStudentUIOptions
): Promise<void> {
  const { name, language, cefrLevel, nativeLanguage } = options
  await page.goto('/students/new')
  await expect(page.locator('h1')).toHaveText('Add Student', { timeout: NAV_TIMEOUT })
  await page.getByTestId('student-name').fill(name)
  await page.getByTestId('student-language').click()
  await page.getByRole('option', { name: language }).click()
  await page.getByTestId('student-cefr').click()
  await page.getByRole('option', { name: cefrLevel }).click()
  if (nativeLanguage) {
    await page.getByTestId('student-native-language').click()
    await page.getByRole('option', { name: nativeLanguage }).click()
    await page.keyboard.press('Escape')
  }
  await page.getByTestId('done-btn').click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })
}

/**
 * Looks up a seeded student by exact name, paging through `/api/students`
 * until found. Replaces the prior `?pageSize=100` workaround so tests stay
 * stable as the visual seed roster grows.
 */
export async function findStudentByName(
  page: Page,
  name: string,
  authHeader: Record<string, string> = { Authorization: 'Bearer test-token' },
): Promise<{ id: string; name: string }> {
  const PAGE_SIZE = 50
  const MAX_PAGES = 20
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const res = await page.request.get(
      `${API_BASE}/api/students?page=${pageNum}&pageSize=${PAGE_SIZE}`,
      { headers: authHeader },
    )
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as {
      items: Array<{ id: string; name: string }>
      totalCount: number
    }
    const match = body.items.find((s) => s.name === name)
    if (match) return match
    if (pageNum * PAGE_SIZE >= body.totalCount) break
  }
  throw new Error(
    `Student '${name}' not found. Ensure the visual seed step ran before tests.`,
  )
}

export interface CreateStudentApiOptions {
  name: string
  language?: string
  cefrLevel?: string
}

export async function createStudentViaApi(
  page: Page,
  options: CreateStudentApiOptions
): Promise<{ id: string; name: string }> {
  const res = await page.request.post(`${API_BASE}/api/students`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: {
      name: options.name,
      learningLanguage: options.language ?? 'Spanish',
      cefrLevel: options.cefrLevel ?? 'B1',
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
    },
  })
  expect(res.ok()).toBeTruthy()
  return res.json() as Promise<{ id: string; name: string }>
}
