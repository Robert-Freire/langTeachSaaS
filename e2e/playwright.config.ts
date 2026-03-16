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
      testIgnore: ['**/teacher-profile.spec.ts', '**/provider-switch.spec.ts', '**/registration.spec.ts'],
      fullyParallel: true,
      workers: 4,
    },
    {
      name: 'serial',
      testMatch: ['**/teacher-profile.spec.ts', '**/provider-switch.spec.ts'],
      workers: 1,
      dependencies: ['parallel'],
    },
    {
      // Registration deletes and recreates the shared teacher record, so it
      // must run after all other tests that depend on the teacher existing.
      name: 'destructive',
      testMatch: ['**/registration.spec.ts'],
      dependencies: ['serial'],
    },
  ],
})
