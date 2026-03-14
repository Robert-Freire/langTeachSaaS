import { test, expect } from '@playwright/test'

test('auth redirect diagnostic', async ({ page }) => {
  const consoleLogs: string[] = []
  const urlHistory: string[] = []

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) urlHistory.push(frame.url())
  })

  // Clear any cached Auth0 state from previous runs
  await page.context().clearCookies()
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }).catch(() => {})

  // Navigate and wait up to 5s to see what happens
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  console.log('\n=== URL HISTORY ===')
  urlHistory.forEach((url, i) => console.log(`  ${i + 1}. ${url}`))

  console.log('\n=== BROWSER CONSOLE LOGS ===')
  consoleLogs.forEach(l => console.log(' ', l))

  console.log('\n=== CURRENT URL ===')
  console.log(' ', page.url())

  console.log('\n=== PAGE CONTENT ===')
  console.log(' ', await page.locator('body').innerText().catch(() => '[could not read]'))
})
