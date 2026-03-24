import { chromium } from '@playwright/test'
import { createQAAuthContext } from './helpers/auth'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(__dirname, '../../../..', '.env.qa') })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()
  page.setViewportSize({ width: 1440, height: 900 })

  // Intercept the XHR response
  const [lessonsResp] = await Promise.all([
    page.waitForResponse(r =>
      r.url().includes('/api/lessons') &&
      r.status() === 200 &&
      r.request().resourceType() === 'xhr'
    ),
    page.goto(`${baseURL}/lessons`)
  ])

  const body = await lessonsResp.json()
  // API might return { items: [...] } or [...]
  const lessons = Array.isArray(body) ? body : body.items || body.data || []
  console.log(`Found ${lessons.length} lessons. Keys: ${Object.keys(body)}`)

  if (lessons.length === 0) {
    console.log('No lessons, aborting')
    await browser.close()
    return
  }

  const target = lessons.find((l: any) => l.title?.includes('Sprint Review')) || lessons[0]
  console.log('Target:', target.id, '-', target.title)

  // Navigate to lesson editor
  await page.goto(`${baseURL}/lessons/${target.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('URL:', page.url())

  // Dismiss tooltip
  await page.mouse.click(50, 50)
  await page.waitForTimeout(500)
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.waitForTimeout(500)

  await page.screenshot({ path: path.resolve(__dirname, '../output/sprint-screenshots/lesson-editor-clean.png'), fullPage: false })
  console.log('Screenshot saved')

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
