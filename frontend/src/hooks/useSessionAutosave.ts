import { useRef, useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSession, updateSession, type CreateSessionLogRequest, type SessionLog } from '../api/sessionLogs'
import { type SaveStatus, DEBOUNCE_MS, IDLE_RESET_MS, RETRY_DELAY_MS, MAX_RETRIES } from '../lib/autosaveConstants'

interface UseSessionAutosaveResult {
  status: SaveStatus
  sessionId: string | null
  /** ISO timestamp of the most recent successful save, or null if no save has succeeded yet this mount. */
  lastSavedAt: string | null
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
 * Manages autosave for the Log Session form (create and edit mode).
 *
 * Create mode: first save calls createSession(), stores the returned ID.
 * Edit mode: pass `initialSessionId` to start with an existing ID so saves call updateSession() immediately.
 *
 * @param studentId - The student id. Pass undefined to disable autosave.
 * @param getFormData - A ref whose `.current` returns the full CreateSessionLogRequest snapshot.
 * @param initialSessionId - Optional existing session ID for edit mode.
 */
export function useSessionAutosave(
  studentId: string | undefined,
  getFormData: React.MutableRefObject<(() => CreateSessionLogRequest) | null>,
  initialSessionId?: string,
): UseSessionAutosaveResult {
  const queryClient = useQueryClient()
  // Tracks whether we are currently showing 'saved' (vs 'idle' after the 2s window).
  // React Query keeps isSuccess=true indefinitely; this flag handles the timed reset.
  const [showSaved, setShowSaved] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // sessionIdRef drives the create-vs-update decision inside mutationFn.
  // It is kept in sync with sessionId state but is readable synchronously.
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed session ID for edit mode once it becomes available (initialSessionId
  // may arrive after mount when the page fetches session data asynchronously).
  useEffect(() => {
    if (initialSessionId && !sessionIdRef.current) {
      sessionIdRef.current = initialSessionId
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionId(initialSessionId)
    }
  }, [initialSessionId])

  const mutation = useMutation({
    mutationFn: async ({ reqStudentId, data }: { reqStudentId: string; data: CreateSessionLogRequest }): Promise<SessionLog> => {
      if (!sessionIdRef.current) {
        const created = await createSession(reqStudentId, data)
        sessionIdRef.current = created.id
        setSessionId(created.id)
        return created
      }
      return updateSession(reqStudentId, sessionIdRef.current, data)
    },
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY_MS,
    onSuccess: (updated) => {
      // Keep RQ cache in sync with the authoritative server response so that
      // navigating away and back (or any other consumer of these keys) sees
      // fresh data without an extra refetch. Without this, clicking back +
      // reopening the session surfaces the pre-edit value because the cached
      // SessionLog was never updated.
      if (studentId) {
        queryClient.setQueryData<SessionLog>(['session', studentId, updated.id], updated)
        queryClient.setQueryData<SessionLog[]>(['sessions', studentId], (list) =>
          list ? list.map(s => s.id === updated.id ? updated : s) : list,
        )
      }
      setLastSavedAt(updated.updatedAt)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      setShowSaved(true)
      idleTimerRef.current = setTimeout(() => {
        setShowSaved(false)
        idleTimerRef.current = null
      }, IDLE_RESET_MS)
    },
  })

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  // Derive status: React Query owns retry/error/pending; local state owns saved vs idle.
  let status: SaveStatus = showSaved ? 'saved' : 'idle'
  if (mutation.isPending) {
    status = mutation.failureCount > 0 ? 'retrying' : 'saving'
  } else if (mutation.isError) {
    status = 'error'
  }

  const { mutateAsync } = mutation

  const doSave = useCallback(async (override?: Partial<CreateSessionLogRequest>): Promise<string | null> => {
    if (!studentId) return null
    const baseData = getFormData.current?.()
    if (!baseData) return null
    const data = override ? { ...baseData, ...override } : baseData
    try {
      // Cancel any in-flight GET for this session so that a late refetch response
      // doesn't overwrite the optimistic cache update we're about to make in onSuccess.
      // Inside the try so any (unexpected) rejection still yields a null return
      // and keeps doSave's failure semantics uniform for scheduleTextSave callers.
      if (sessionIdRef.current) {
        await queryClient.cancelQueries({ queryKey: ['session', studentId, sessionIdRef.current] })
      }
      const result = await mutateAsync({ reqStudentId: studentId, data })
      return result.id
    } catch {
      return null
    }
  }, [studentId, getFormData, mutateAsync, queryClient])

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

  return { status, sessionId, lastSavedAt, scheduleTextSave, saveNow }
}
