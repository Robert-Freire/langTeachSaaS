/**
 * Corrections Sprint Spec — real Claude API integration test
 *
 * Exercises the Redacciones correction pipeline end-to-end against the QA stack:
 *   1. Creates A2 and B1 test students (idempotent via upsertStudent)
 *   2. Navigates to the A2 student Redacciones tab
 *   3. Creates corrections for both students via the API (same seed text at two CEFR levels)
 *   4. Triggers Corregir for both via the API
 *   5. Polls for Corregida status (up to 3 minutes per correction, run concurrently)
 *   6. Asserts: (a) Corregida status reached, (b) at least one G tag present,
 *      (c) A2/B1 moat — tag count or category distribution must differ
 *
 * Run: npx playwright test tests/corrections-sprint.spec.ts --config playwright.config.ts
 */
import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { createQAAuthContext } from '../helpers/auth'
import { upsertStudent } from '../helpers/navigation'

// Seed text: a realistic ~180-word redacción with deliberate errors across C/G/L/O categories.
// Submitted unchanged at A2 and B1 to verify CEFR-calibrated markup differs.
const SEED_TEXT = [
  'El fin de semana pasado, yo hago muchas cosas con mis amigos. Primero, fuimos al mercado para',
  'comprar verduras y frutas frescas para preparar una cena especial para toda la familia. Mi madre',
  'siempre dice que ablamos demasiado durante la cena, pero creo que es importante comunicarse bien.',
  '',
  'Después de cenar, vimos una película muy interesante sobre la historia de España. También hablé',
  'con mis amistades viejas por teléfono — llevamos muchos años sin vernos. La conversación fue muy',
  'emotiva y fue bonita recordar los viejos tiempos juntos.',
  '',
  'Y luego fuimos al parque. Y luego volvimos a casa para descansar un poco antes de la noche.',
  'El domingo, depende en mi familia para organizar las actividades del día. Hago muchas fotos con',
  'mi cámara nueva durante el paseo por el barrio histórico. Fue un fin de semana muy completo.',
].join('\n')

const ASSIGNMENT_TITLE = '[QA] Corrections Sprint — A2/B1 moat'
const ASSIGNMENT_PROMPT = 'Describe tu fin de semana.'

const CORREGIDA_POLL_INTERVAL_MS = 3000
const CORREGIDA_TIMEOUT_MS = 180_000

interface CorrectionDetail {
  id: string
  status: string
  tags: Array<{ category: string; spannedText?: string; explanation?: string }>
}

// API calls go through the page context so Auth0 token in localStorage is accessible.
// The frontend on port 5175 reverse-proxies /api to the backend on port 5176.
async function apiCall<T>(
  page: Page,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  extraOkStatuses: number[] = [],
): Promise<T> {
  return page.evaluate(
    async ({ method, path, body, extraOkStatuses }) => {
      const auth0KeyPrefix = '@@auth0spajs@@'
      const cacheKey = Object.keys(localStorage).find(
        k => k.startsWith(auth0KeyPrefix) && !k.endsWith('::@@user@@'),
      )
      if (!cacheKey) throw new Error('Auth0 token cache key not found in localStorage')
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
      if (!res.ok && !extraOkStatuses.includes(res.status)) {
        const text = await res.text()
        throw new Error(`${method} ${path} failed: ${res.status} ${text}`)
      }
      if (res.status === 204 || (res.status === 409 && extraOkStatuses.includes(409)))
        return null as unknown as T
      return res.json() as Promise<T>
    },
    { method, path, body, extraOkStatuses },
  )
}

async function createCorrection(page: Page, studentId: string): Promise<string> {
  const detail = await apiCall<CorrectionDetail>(
    page,
    'POST',
    `/api/students/${studentId}/corrections`,
    { assignmentTitle: ASSIGNMENT_TITLE, assignmentPrompt: ASSIGNMENT_PROMPT, studentText: SEED_TEXT },
  )
  return detail.id
}

async function triggerCorregir(page: Page, studentId: string, correctionId: string): Promise<void> {
  // 200 = corregir accepted; 409 = already running (both are OK)
  await apiCall<null>(
    page,
    'POST',
    `/api/students/${studentId}/corrections/${correctionId}/corregir`,
    undefined,
    [409],
  )
}

async function pollForCorregida(
  page: Page,
  studentId: string,
  correctionId: string,
): Promise<CorrectionDetail> {
  const deadline = Date.now() + CORREGIDA_TIMEOUT_MS
  while (Date.now() < deadline) {
    const detail = await apiCall<CorrectionDetail>(
      page,
      'GET',
      `/api/students/${studentId}/corrections/${correctionId}`,
    )
    if (detail.status === 'Corregida') return detail
    if (detail.status === 'CorreccionFallida') {
      throw new Error(`Correction ${correctionId} reached CorreccionFallida — check Claude API key / backend logs`)
    }
    await new Promise(r => setTimeout(r, CORREGIDA_POLL_INTERVAL_MS))
  }
  throw new Error(
    `Correction ${correctionId} did not reach Corregida within ${CORREGIDA_TIMEOUT_MS / 1000}s`,
  )
}

function tagDistributionKey(tags: CorrectionDetail['tags']): string {
  return tags
    .map(t => t.category)
    .sort()
    .join(',')
}

test('Corrections Sprint — A2/B1 moat and tag coverage', async ({ browser }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()

  // 1. Ensure A2 and B1 students exist (idempotent)
  const a2StudentId = await upsertStudent(page, {
    name: '[QA] Corrections A2',
    language: 'Spanish',
    cefrLevel: 'A2',
    nativeLanguage: 'French',
  })
  const b1StudentId = await upsertStudent(page, {
    name: '[QA] Corrections B1',
    language: 'Spanish',
    cefrLevel: 'B1',
    nativeLanguage: 'German',
  })

  // 2. Navigate to A2 student's Redacciones tab (UI coverage)
  await page.goto(`${baseURL}/students/${a2StudentId}?tab=redacciones`)
  await expect(page.getByTestId('redacciones-tab')).toBeVisible({ timeout: 15000 })

  // 3. Create corrections for both students via the API (same seed text)
  const a2CorrectionId = await createCorrection(page, a2StudentId)
  const b1CorrectionId = await createCorrection(page, b1StudentId)

  console.log(`[corrections-sprint] Created A2 correction ${a2CorrectionId}`)
  console.log(`[corrections-sprint] Created B1 correction ${b1CorrectionId}`)

  // 4. Trigger Corregir for both (fires async background job on the backend)
  await triggerCorregir(page, a2StudentId, a2CorrectionId)
  await triggerCorregir(page, b1StudentId, b1CorrectionId)

  // Navigate to A2 correction detail to show in-progress state (UI coverage)
  await page.goto(`${baseURL}/students/${a2StudentId}/redacciones/${a2CorrectionId}`)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

  // 5. Poll both corrections for Corregida status (real Claude API — up to 3 min each).
  // Run concurrently so total wait is bounded by the slower of the two, not both summed.
  const [a2Detail, b1Detail] = await Promise.all([
    pollForCorregida(page, a2StudentId, a2CorrectionId),
    pollForCorregida(page, b1StudentId, b1CorrectionId),
  ])

  // Navigate to the A2 correction detail to show the final marked-up result (UI coverage)
  await page.goto(`${baseURL}/students/${a2StudentId}/redacciones/${a2CorrectionId}`)
  await expect(page.getByTestId('marked-up-text')).toBeVisible({ timeout: 10000 })

  // 6. Assert (a): Corregida status reached for both levels
  expect(a2Detail.status).toBe('Corregida')
  expect(b1Detail.status).toBe('Corregida')

  const a2Tags = a2Detail.tags ?? []
  const b1Tags = b1Detail.tags ?? []

  console.log(`[corrections-sprint] A2 tags (${a2Tags.length}): ${tagDistributionKey(a2Tags)}`)
  console.log(`[corrections-sprint] B1 tags (${b1Tags.length}): ${tagDistributionKey(b1Tags)}`)

  // Save run artifacts for post-run review (matches teacher-qa spec convention)
  const outputDir = path.resolve(
    __dirname,
    '../../output',
    `corrections-sprint-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
  )
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(
    path.join(outputDir, 'run-metadata.json'),
    JSON.stringify({
      persona: 'Corrections Sprint',
      a2StudentId,
      b1StudentId,
      a2CorrectionId,
      b1CorrectionId,
      a2TagCount: a2Tags.length,
      b1TagCount: b1Tags.length,
      a2Distribution: tagDistributionKey(a2Tags),
      b1Distribution: tagDistributionKey(b1Tags),
      branch: process.env.QA_BRANCH ?? 'unknown',
      timestamp: new Date().toISOString(),
    }, null, 2),
  )
  fs.writeFileSync(
    path.join(outputDir, 'correction-tags.json'),
    JSON.stringify({ a2: a2Detail, b1: b1Detail }, null, 2),
  )
  console.log(`[corrections-sprint] Artifacts saved to ${outputDir}`)

  // 6. Assert (b): at least one G (Grammar) tag present across both corrections
  const allTags = [...a2Tags, ...b1Tags]
  expect(allTags.some(t => t.category === 'G')).toBe(true)

  // 6. Assert (c): CEFR moat — A2 and B1 must differ in tag count or category distribution
  const countDiffers = a2Tags.length !== b1Tags.length
  const distributionDiffers = tagDistributionKey(a2Tags) !== tagDistributionKey(b1Tags)
  expect(countDiffers || distributionDiffers).toBe(true)

  await context.close()
})
