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
        '**/regenerate-direction.spec.ts',
        '**/grammar-type.spec.ts',
        '**/reading-type.spec.ts',
        '**/exercises-type-mock.spec.ts',
        '**/lesson-sections.spec.ts',
        '**/courses.spec.ts',
        '**/cefr-mismatch-warning.spec.ts',
        '**/ai-guardrails.spec.ts',
      ],
      fullyParallel: true,
      workers: 8,
    },
    {
      name: 'parallel',
      testIgnore: [
        '**/visual/**',
        '**/teacher-profile.spec.ts',
        '**/provider-switch.spec.ts',
        '**/registration.spec.ts',
        '**/ai-guardrails.spec.ts',
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
        '**/regenerate-direction.spec.ts',
        '**/grammar-type.spec.ts',
        '**/reading-type.spec.ts',
        '**/exercises-type-mock.spec.ts',
        '**/lesson-sections.spec.ts',
        '**/courses.spec.ts',
        '**/cefr-mismatch-warning.spec.ts',
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
    {
      // Visual specs: screenshot each screen for review-ui agent.
      // Run against a seeded stack (start-visual-stack.sh).
      // The onboarding spec resets teacher state and is serial; run it last.
      name: 'visual',
      testMatch: ['**/visual/**/*.spec.ts'],
      testIgnore: ['**/visual/onboarding.visual.spec.ts'],
      fullyParallel: true,
      workers: 4,
    },
    {
      // Onboarding visual spec resets the shared teacher record; must run after all visual specs.
      name: 'visual-onboarding',
      testMatch: ['**/visual/onboarding.visual.spec.ts'],
      workers: 1,
      dependencies: ['visual'],
    },
  ],
})
