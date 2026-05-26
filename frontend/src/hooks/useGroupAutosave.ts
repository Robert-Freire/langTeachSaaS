import { useRef, useState, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateGroup } from '../api/groups'
import type { GroupFormData } from '../api/groups'
import { type SaveStatus, DEBOUNCE_MS, IDLE_RESET_MS, RETRY_DELAY_MS, MAX_RETRIES } from '../lib/autosaveConstants'

interface UseGroupAutosaveResult {
  status: SaveStatus
  scheduleTextSave: () => void
  saveNow: (override?: Partial<GroupFormData>) => void
}

export function useGroupAutosave(
  groupId: string | undefined,
  getFormData: React.MutableRefObject<(() => GroupFormData | null) | null>,
): UseGroupAutosaveResult {
  const [showSaved, setShowSaved] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When a save fires while one is in-flight, store the latest payload so it is
  // sent in onSuccess rather than being silently dropped. Without this, a save
  // that starts while mutation.isPending could overwrite newer data with a stale snapshot.
  const queuedPayloadRef = useRef<{ id: string; data: GroupFormData } | null>(null)

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GroupFormData }) =>
      updateGroup(id, data),
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

  // Flush queued payload after each settled mutation (success or final error).
  // Using an effect keyed on isPending avoids the circular-ref problem of calling
  // mutate inside onSuccess.
  const isPending = mutation.isPending
  const { mutate } = mutation
  useEffect(() => {
    if (!isPending && queuedPayloadRef.current) {
      const payload = queuedPayloadRef.current
      queuedPayloadRef.current = null
      mutate(payload)
    }
  }, [isPending, mutate])

  let status: SaveStatus = showSaved ? 'saved' : 'idle'
  if (mutation.isPending) {
    status = mutation.failureCount > 0 ? 'retrying' : 'saving'
  } else if (mutation.isError) {
    status = 'error'
  }

  const doSave = useCallback((override?: Partial<GroupFormData>) => {
    if (!groupId) return
    const baseData = getFormData.current?.()
    if (!baseData) return
    const data = override ? { ...baseData, ...override } : baseData
    const payload = { id: groupId, data }
    if (isPending) {
      // Keep only the most recent snapshot; older queued payloads are superseded.
      queuedPayloadRef.current = payload
      return
    }
    mutate(payload)
  }, [groupId, getFormData, mutate, isPending])

  const scheduleTextSave = useCallback(() => {
    if (!groupId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => doSave(), DEBOUNCE_MS)
  }, [groupId, doSave])

  const saveNow = useCallback((override?: Partial<GroupFormData>) => {
    if (!groupId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    doSave(override)
  }, [groupId, doSave])

  return { status, scheduleTextSave, saveNow }
}
