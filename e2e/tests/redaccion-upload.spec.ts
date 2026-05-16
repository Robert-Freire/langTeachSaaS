import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { createStudentViaApi } from '../helpers/students'
import { NAV_TIMEOUT, UI_TIMEOUT } from '../helpers/timeouts'
import path from 'path'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

async function openNewRedaccionDrawer(
  browser: Browser,
  studentId: string,
): Promise<{ page: Page; ctx: BrowserContext }> {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await page.goto(`/students/${studentId}`)
  await expect(page.getByTestId('student-detail-name')).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.getByTestId('tab-redacciones').click()

  // The tab may show the empty CTA (no redacciones yet) or the list-level new button
  const emptyBtn = page.getByTestId('redacciones-empty-cta')
  const newBtn = page.getByTestId('redacciones-new-button')
  const emptyVisible = await emptyBtn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)
  const newVisible = emptyVisible ? false : await newBtn.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)
  if (!emptyVisible && !newVisible)
    throw new Error('Neither redacciones-empty-cta nor redacciones-new-button is visible')
  await (emptyVisible ? emptyBtn : newBtn).click()

  await expect(page.getByTestId('correction-drawer')).toBeVisible({ timeout: UI_TIMEOUT })
  return { page, ctx }
}

test('.docx upload populates student text field without error', async ({ browser }) => {
  const setupCtx = await createMockAuthContext(browser)
  const setupPage = await setupCtx.newPage()
  const student = await createStudentViaApi(setupPage, {
    name: `Upload Docx ${Date.now()}`,
    cefrLevel: 'B1',
  })
  await setupPage.close()
  await setupCtx.close()

  const { page, ctx } = await openNewRedaccionDrawer(browser, student.id)

  const fileInput = page.getByTestId('correction-drawer-file-input')
  await fileInput.setInputFiles(path.resolve(__dirname, '../fixtures/test-document.docx'))

  await expect(page.getByTestId('correction-drawer-ocr-error')).not.toBeVisible({ timeout: UI_TIMEOUT })

  const textarea = page.getByTestId('correction-drawer-text')
  await expect(textarea).not.toBeEmpty({ timeout: UI_TIMEOUT })
  await expect(textarea).toContainText('prueba', { timeout: UI_TIMEOUT })

  await ctx.close()
})

test('text-layer PDF upload populates student text field without error', async ({ browser }) => {
  const setupCtx = await createMockAuthContext(browser)
  const setupPage = await setupCtx.newPage()
  const student = await createStudentViaApi(setupPage, {
    name: `Upload PDF ${Date.now()}`,
    cefrLevel: 'B1',
  })
  await setupPage.close()
  await setupCtx.close()

  const { page, ctx } = await openNewRedaccionDrawer(browser, student.id)

  const fileInput = page.getByTestId('correction-drawer-file-input')
  await fileInput.setInputFiles(path.resolve(__dirname, '../fixtures/test-document.pdf'))

  await expect(page.getByTestId('correction-drawer-ocr-error')).not.toBeVisible({ timeout: UI_TIMEOUT })

  const textarea = page.getByTestId('correction-drawer-text')
  await expect(textarea).not.toBeEmpty({ timeout: UI_TIMEOUT })

  await ctx.close()
})

test('image upload populates student text field (requires Azure Vision)', async ({ browser }) => {
  // Skip when Vision is not configured -- AzureVisionTextExtractor gracefully degrades but
  // image uploads will have no handler, returning OCR_FORMAT_UNSUPPORTED.
  test.skip(
    !process.env.AZURE_AI_VISION_ENDPOINT,
    'Azure Vision not configured; set AZURE_AI_VISION_ENDPOINT to run image upload test',
  )

  const setupCtx = await createMockAuthContext(browser)
  const setupPage = await setupCtx.newPage()
  const student = await createStudentViaApi(setupPage, {
    name: `Upload Image ${Date.now()}`,
    cefrLevel: 'B1',
  })
  await setupPage.close()
  await setupCtx.close()

  const { page, ctx } = await openNewRedaccionDrawer(browser, student.id)

  const fileInput = page.getByTestId('correction-drawer-file-input')
  await fileInput.setInputFiles(path.resolve(__dirname, '../fixtures/test-image.png'))

  await expect(page.getByTestId('correction-drawer-ocr-error')).not.toBeVisible({ timeout: UI_TIMEOUT })

  const textarea = page.getByTestId('correction-drawer-text')
  await expect(textarea).not.toBeEmpty({ timeout: UI_TIMEOUT })

  await ctx.close()
})
