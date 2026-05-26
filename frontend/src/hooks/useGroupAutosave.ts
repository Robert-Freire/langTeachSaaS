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

  let status: SaveStatus = showSaved ? 'saved' : 'idle'
  if (mutation.isPending) {
    status = mutation.failureCount > 0 ? 'retrying' : 'saving'
  } else if (mutation.isError) {
    status = 'error'
  }

  const { mutate } = mutation

  const doSave = useCallback((override?: Partial<GroupFormData>) => {
    if (!groupId) return
    const baseData = getFormData.current?.()
    if (!baseData) return
    const data = override ? { ...baseData, ...override } : baseData
    mutate({ id: groupId, data })
  }, [groupId, getFormData, mutate])

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
