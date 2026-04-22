import { useRef, useState, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateStudent } from '../api/students'
import type { StudentFormData } from '../api/students'
import { type SaveStatus, DEBOUNCE_MS, IDLE_RESET_MS, RETRY_DELAY_MS, MAX_RETRIES } from '../lib/autosaveConstants'

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
  // Tracks whether we are currently showing 'saved' (vs 'idle' after the 2s window).
  // React Query keeps isSuccess=true indefinitely; this flag handles the timed reset.
  const [showSaved, setShowSaved] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentFormData }) =>
      updateStudent(id, data),
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY_MS,
    onSuccess: () => {
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

  const { mutate } = mutation

  const doSave = useCallback((override?: Partial<StudentFormData>) => {
    if (!studentId) return
    const baseData = getFormData.current?.()
    if (!baseData) return
    const data = override ? { ...baseData, ...override } : baseData
    mutate({ id: studentId, data })
  }, [studentId, getFormData, mutate])

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
