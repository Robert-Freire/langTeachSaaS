import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

// Load .env.qa from the project root (three levels up from this file)
config({ path: path.resolve(__dirname, '../../../..', '.env.qa') })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // Teacher QA runs are sequential (create data, then evaluate) and slow (real Claude API)
  workers: 1,
  timeout: 600_000, // 10 minutes per test — real Claude generation can take 60-90s + setup overhead
  reporter: [['list'], ['json', { outputFile: '../output/last-run-results.json' }]],
  outputDir: '../output/test-artifacts',
})
