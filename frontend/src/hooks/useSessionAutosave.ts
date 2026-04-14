import { useRef, useState, useCallback, useEffect } from 'react'
import { createSession, updateSession, type CreateSessionLogRequest } from '../api/sessionLogs'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error'

const DEBOUNCE_MS = 400
const IDLE_RESET_MS = 2000
const RETRY_DELAY_MS = 3000
const MAX_RETRIES = 3

interface UseSessionAutosaveResult {
  status: SaveStatus
  sessionId: string | null
  /**
   * Schedule a debounced save (fires 400ms after last call).
   * Reads form state from `getFormData.current()` at save time.
   */
  scheduleTextSave: () => void
  /**
   * Fire a save immediately, bypassing the debounce.
   * Pass `override` to merge extra fields on top of what `getFormData.current()` returns.
   * Returns a promise that resolves to the session ID (after create or update).
   */
  saveNow: (override?: Partial<CreateSessionLogRequest>) => Promise<string | null>
}

/**
 * Manages autosave for the Log Session form (create-mode).
 *
 * First save: calls createSession(), stores the returned ID.
 * Subsequent saves: calls updateSession() with the stored ID.
 *
 * @param studentId - The student id. Pass undefined to disable autosave.
 * @param getFormData - A ref whose `.current` returns the full CreateSessionLogRequest snapshot.
 */
export function useSessionAutosave(
  studentId: string | undefined,
  getFormData: React.MutableRefObject<(() => CreateSessionLogRequest) | null>,
): UseSessionAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  const doSave = useCallback(async (override?: Partial<CreateSessionLogRequest>): Promise<string | null> => {
    if (!studentId || !isMountedRef.current) return null

    const baseData = getFormData.current?.()
    if (!baseData) return null

    const data = override ? { ...baseData, ...override } : baseData

    if (!isMountedRef.current) return null
    setStatus('saving')

    try {
      let id: string
      if (!sessionIdRef.current) {
        const session = await createSession(studentId, data)
        id = session.id
        sessionIdRef.current = id
        if (isMountedRef.current) setSessionId(id)
      } else {
        await updateSession(studentId, sessionIdRef.current, data)
        id = sessionIdRef.current
      }

      retryCountRef.current = 0
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
      if (!isMountedRef.current) return id
      setStatus('saved')
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setStatus('idle')
      }, IDLE_RESET_MS)
      return id
    } catch {
      if (!isMountedRef.current) return null
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1
        setStatus('retrying')
        retryTimerRef.current = setTimeout(() => {
          // eslint-disable-next-line react-hooks/immutability
          if (isMountedRef.current) void doSave(override)
        }, RETRY_DELAY_MS)
      } else {
        setStatus('error')
      }
      return null
    }
  }, [studentId, getFormData])

  const scheduleTextSave = useCallback(() => {
    if (!studentId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => { void doSave() }, DEBOUNCE_MS)
  }, [studentId, doSave])

  const saveNow = useCallback(async (override?: Partial<CreateSessionLogRequest>): Promise<string | null> => {
    if (!studentId) return null
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    return doSave(override)
  }, [studentId, doSave])

  return { status, sessionId, scheduleTextSave, saveNow }
}
