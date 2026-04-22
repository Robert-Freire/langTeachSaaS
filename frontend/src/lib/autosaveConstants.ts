export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error'

export const DEBOUNCE_MS = 400
export const IDLE_RESET_MS = 2000
export const RETRY_DELAY_MS = 3000
export const MAX_RETRIES = 3

export const SAVED_VISIBLE_DURATION_MS = 1500
export const ERROR_VISIBLE_DURATION_MS = 3000
