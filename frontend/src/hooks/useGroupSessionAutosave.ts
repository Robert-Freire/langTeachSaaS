import { useRef, useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type CreateSessionLogRequest, type SessionLog } from '../api/sessionLogs'
import { createGroupSession, updateGroupSession } from '../api/groups'
import { type SaveStatus, DEBOUNCE_MS, IDLE_RESET_MS, RETRY_DELAY_MS, MAX_RETRIES } from '../lib/autosaveConstants'

interface UseGroupSessionAutosaveResult {
  status: SaveStatus
  sessionId: string | null
  lastSavedAt: string | null
  scheduleTextSave: () => void
  saveNow: (override?: Partial<CreateSessionLogRequest>) => Promise<string | null>
}

export function useGroupSessionAutosave(
  groupId: string | undefined,
  getFormData: React.MutableRefObject<(() => CreateSessionLogRequest) | null>,
  initialSessionId?: string,
): UseGroupSessionAutosaveResult {
  const queryClient = useQueryClient()
  const [showSaved, setShowSaved] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const sessionIdRef = useRef<string | null>(initialSessionId ?? null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialSessionId && !sessionIdRef.current) {
      sessionIdRef.current = initialSessionId
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionId(initialSessionId)
    }
  }, [initialSessionId])

  const mutation = useMutation({
    mutationFn: async ({ reqGroupId, data }: { reqGroupId: string; data: CreateSessionLogRequest }): Promise<SessionLog> => {
      if (!sessionIdRef.current) {
        const created = await createGroupSession(reqGroupId, data)
        sessionIdRef.current = created.id
        setSessionId(created.id)
        return created
      }
      return updateGroupSession(reqGroupId, sessionIdRef.current, data)
    },
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY_MS,
    onSuccess: (updated) => {
      if (groupId) {
        queryClient.setQueryData<SessionLog[]>(['group-sessions', groupId], (list) =>
          list
            ? list.some(s => s.id === updated.id)
              ? list.map(s => s.id === updated.id ? updated : s)
              : [updated, ...list]
            : [updated],
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

  let status: SaveStatus = showSaved ? 'saved' : 'idle'
  if (mutation.isPending) {
    status = mutation.failureCount > 0 ? 'retrying' : 'saving'
  } else if (mutation.isError) {
    status = 'error'
  }

  const { mutateAsync } = mutation

  const doSave = useCallback(async (override?: Partial<CreateSessionLogRequest>): Promise<string | null> => {
    if (!groupId) return null
    const baseData = getFormData.current?.()
    if (!baseData) return null
    const data = override ? { ...baseData, ...override } : baseData
    try {
      // Cancel any in-flight GET for this session so a late refetch response
      // doesn't overwrite the optimistic cache update made in onSuccess.
      if (sessionIdRef.current) {
        await queryClient.cancelQueries({ queryKey: ['group-session', groupId, sessionIdRef.current] })
      }
      const result = await mutateAsync({ reqGroupId: groupId, data })
      return result.id
    } catch {
      return null
    }
  }, [groupId, getFormData, mutateAsync, queryClient])

  const scheduleTextSave = useCallback(() => {
    if (!groupId) return
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => { void doSave() }, DEBOUNCE_MS)
  }, [groupId, doSave])

  const saveNow = useCallback(async (override?: Partial<CreateSessionLogRequest>): Promise<string | null> => {
    if (!groupId) return null
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    return doSave(override)
  }, [groupId, doSave])

  return { status, sessionId, lastSavedAt, scheduleTextSave, saveNow }
}
