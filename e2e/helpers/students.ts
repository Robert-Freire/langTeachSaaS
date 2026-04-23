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
  await page.getByRole('button', { name: 'Save Student' }).click()
  await expect(page).toHaveURL(/\/students\/(?!new$)[^/]+$/, { timeout: UI_TIMEOUT })
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
