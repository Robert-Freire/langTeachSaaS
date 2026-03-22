import { Browser, BrowserContext } from '@playwright/test'

/**
 * Creates a BrowserContext authenticated as the Teacher QA user.
 * Uses real Auth0 credentials — requires the QA stack to be running with
 * ASPNETCORE_ENVIRONMENT=Development (real JWT validation, not E2ETesting bypass).
 *
 * Reads credentials from env: TEACHER_QA_EMAIL, TEACHER_QA_PASSWORD
 * Loaded from .env.qa at the project root via playwright.config.ts.
 */
export async function createQAAuthContext(browser: Browser): Promise<BrowserContext> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
  const email = process.env.TEACHER_QA_EMAIL
  const password = process.env.TEACHER_QA_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEACHER_QA_EMAIL and TEACHER_QA_PASSWORD must be set in .env.qa. ' +
      'See .env.qa.example and .claude/skills/teacher-qa/SKILL.md for setup instructions.'
    )
  }

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(baseURL)

  // Auth0 Universal Login form
  await page.fill('[name="username"]', email)
  await page.fill('[name="password"]', password)
  await page.click('[name="action"]')

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

  // Handle Auth0 consent screen if it appears.
  // Permanently fix: Auth0 dashboard > Applications > APIs > LangTeach API >
  // Settings > Allow Skipping User Consent
  if (page.url().includes('/u/consent')) {
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first()
    await submitBtn.click()
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  }

  // Wait until redirected back to the app
  await page.waitForURL(`${baseURL}/**`, { timeout: 30000 })
  await page.close()

  return context
}
