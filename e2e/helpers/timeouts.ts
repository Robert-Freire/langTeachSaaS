/** Shared timeout constants for e2e tests (milliseconds). */

/** Full test timeout: accounts for login, AI streaming, and navigation. */
export const TEST_TIMEOUT = 90_000

/** AI streaming can take up to ~30s; allow extra margin for insert. */
export const AI_STREAM_TIMEOUT = 45_000

/** Standard navigation / page-load wait. */
export const NAV_TIMEOUT = 15_000

/** Short UI interaction wait. */
export const UI_TIMEOUT = 10_000

/** Brief feedback indicator wait. */
export const FEEDBACK_TIMEOUT = 5_000

/** Full-lesson generation: 5 sequential AI calls with mock streams. */
export const GENERATION_TIMEOUT = 60_000
