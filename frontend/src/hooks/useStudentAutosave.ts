import { useRef, useState, useCallback, useEffect } from 'react'
import { updateStudent } from '../api/students'
import type { StudentFormData } from '../api/students'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 400
const IDLE_RESET_MS = 2000
const RETRY_DELAY_MS = 3000
const MAX_RETRIES = 3

interface UseStudentAutosaveResult {
  status: SaveStatus
  /**
   * Schedule a debounced save (fires 400ms after last call).
   * Reads form state from `getFormData.current()` at save time.
   * Use for text fields where state has committed before the timer fires.
   */
  scheduleTextSave: () => void
  /**
   * Fire a save immediately, bypassing the debounce.
   * Pass `override` to merge extra fields on top of what `getFormData.current()` returns.
   * Use for dropdowns/toggles where React state hasn't yet committed at call time.
   */
  saveNow: (override?: Partial<StudentFormData>) => void
}

/**
 * Manages debounced autosave for the Edit Student form.
 *
 * @param studentId - The student id to update. Pass undefined for new-student mode (autosave disabled).
 * @param getFormData - A ref whose `.current` returns the full StudentFormData snapshot,
 *   or null if required fields are missing (save is blocked).
 */
export function useStudentAutosave(
  studentId: string | undefined,
  getFormData: React.MutableRefObject<(() => StudentFormData | null) | null>,
): UseStudentAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle')

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

  const doSave = useCallback(async (override?: Partial<StudentFormData>) => {
    if (!studentId || !isMountedRef.current) return

    const baseData = getFormData.current?.()
    if (!baseData) return  // required fields missing - blocked

    const data = override ? { ...baseData, ...override } : baseData

    if (!isMountedRef.current) return
    setStatus('saving')

    try {
      await updateStudent(studentId, data)
      retryCountRef.current = 0
      if (!isMountedRef.current) return
      setStatus('saved')
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setStatus('idle')
      }, IDLE_RESET_MS)
    } catch {
      if (!isMountedRef.current) return
      setStatus('error')
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1
        retryTimerRef.current = setTimeout(() => {
          // eslint-disable-next-line react-hooks/immutability
          if (isMountedRef.current) doSave()
        }, RETRY_DELAY_MS)
      }
    }
  }, [studentId, getFormData])

  const scheduleTextSave = useCallback(() => {
    if (!studentId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => doSave(), DEBOUNCE_MS)
  }, [studentId, doSave])

  const saveNow = useCallback((override?: Partial<StudentFormData>) => {
    if (!studentId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    doSave(override)
  }, [studentId, doSave])

  return { status, scheduleTextSave, saveNow }
}
