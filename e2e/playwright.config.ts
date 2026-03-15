import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env' })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    headless: true,
  },
  projects: [
    {
      name: 'parallel',
      testIgnore: ['**/teacher-profile.spec.ts'],
    },
    {
      name: 'serial',
      testMatch: ['**/teacher-profile.spec.ts'],
      dependencies: ['parallel'],
    },
  ],
})
