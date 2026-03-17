import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env' })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    headless: true,
  },
  projects: [
    {
      name: 'mock-auth',
      testMatch: [
        '**/dashboard.spec.ts',
        '**/lessons.spec.ts',
        '**/students.spec.ts',
        '**/typed-content-view.spec.ts',
        '**/lesson-ai-generate.spec.ts',
        '**/teacher-profile.spec.ts',
        '**/conversation-type.spec.ts',
        '**/full-lesson-generation.spec.ts',
        '**/homework-type.spec.ts',
        '**/pdf-export.spec.ts',
        '**/lesson-notes.spec.ts',
      ],
      fullyParallel: true,
      workers: 8,
    },
    {
      name: 'parallel',
      testIgnore: [
        '**/teacher-profile.spec.ts',
        '**/provider-switch.spec.ts',
        '**/registration.spec.ts',
        '**/dashboard.spec.ts',
        '**/lessons.spec.ts',
        '**/students.spec.ts',
        '**/typed-content-view.spec.ts',
        '**/lesson-ai-generate.spec.ts',
        '**/conversation-type.spec.ts',
        '**/full-lesson-generation.spec.ts',
        '**/homework-type.spec.ts',
        '**/pdf-export.spec.ts',
        '**/lesson-notes.spec.ts',
      ],
      fullyParallel: true,
      workers: 4,
    },
    {
      name: 'serial',
      testMatch: ['**/provider-switch.spec.ts'],
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
