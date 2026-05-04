import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  applyNewSessionProposal,
  applySessionProposal,
  applyStudentProposal,
  applyStudentProposalAppend,
  applyTodoProposal,
  type NewSessionData,
  type NewStudentData,
  type ProposalDto,
  proposeAssistant,
} from '../api/assistant'
// Re-export so consumers don't need to import from api/assistant directly
export type { NewSessionData, NewStudentData }
import { createStudent } from '../api/students'
import { normalizeLanguage, normalizeLanguages } from '../lib/extractionNormalizer'

export type ProposalStatus = 'proposed' | 'applying' | 'applied' | 'dismissed' | 'error'

export interface ProposalWithStatus extends ProposalDto {
  status: ProposalStatus
  errorMessage?: string
  undoVisible: boolean
}

export interface AtelierAssistantState {
  transcription: string | null
  processing: boolean
  proposals: ProposalWithStatus[]
}

export interface AtelierAssistantActions {
  submit: (text: string) => void
  apply: (id: string) => void
  dismiss: (id: string) => void
  undoDismiss: (id: string) => void
  modifyProposal: (id: string, newValue: string) => void
  applyAll: () => void
  dismissAll: () => void
  reset: () => void
  onEditPayload: (id: string, payload: NewStudentData | NewSessionData | Record<string, unknown>) => void
}

export function useAtelierAssistant(
  studentId: string | null,
  sessionId: string | null,
): AtelierAssistantState & AtelierAssistantActions {
  const queryClient = useQueryClient()
  const [transcription, setTranscription] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [proposals, setProposals] = useState<ProposalWithStatus[]>([])
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const applyingIdsRef = useRef<Set<string>>(new Set())
  const generationRef = useRef(0)
  // Ref keeps apply/applyAll free of stale closure on proposals
  const proposalsRef = useRef<ProposalWithStatus[]>([])
  useEffect(() => { proposalsRef.current = proposals }, [proposals])

  // Clear all undo timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      undoTimers.current.forEach(timer => clearTimeout(timer))
      undoTimers.current.clear()
    }
  }, [])

  const updateProposal = useCallback((id: string, patch: Partial<ProposalWithStatus>) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }, [])

  const submit = useCallback(async (text: string) => {
    const gen = ++generationRef.current
    setTranscription(text)
    setProcessing(true)
    const hasPending = proposalsRef.current.some(p => p.status === 'proposed')
    if (!hasPending) setProposals([])
    try {
      const { proposals: raw } = await proposeAssistant(
        text,
        studentId ?? undefined,
        sessionId ?? undefined,
      )
      if (generationRef.current !== gen) return
      if (!hasPending) {
        setProposals(raw.map(p => ({ ...p, status: 'proposed', undoVisible: false })))
      } else {
        setProposals(prev => {
          const updated = [...prev]
          for (const incoming of raw) {
            // todos share type+field ('todo'+'text') so type+field is not a unique key;
            // always append them rather than risk overwriting the wrong card
            if (incoming.type === 'todo') {
              updated.push({ ...incoming, status: 'proposed', undoVisible: false })
              continue
            }
            const idx = updated.findIndex(
              e => e.type === incoming.type && e.field === incoming.field
            )
            if (idx !== -1) {
              if (updated[idx].status === 'proposed') {
                updated[idx] = {
                  ...updated[idx],
                  newValue: incoming.newValue,
                  oldValue: incoming.oldValue,
                  payload: incoming.payload ?? updated[idx].payload,
                  newStudentPayload: incoming.newStudentPayload ?? updated[idx].newStudentPayload,
                }
              }
              // applied/dismissed — leave untouched
            } else {
              updated.push({ ...incoming, status: 'proposed', undoVisible: false })
            }
          }
          return updated
        })
      }
    } catch {
      // Error shown via empty proposals list; processing clears
    } finally {
      if (generationRef.current === gen) setProcessing(false)
    }
  }, [studentId, sessionId])

  const apply = useCallback(async (id: string) => {
    if (applyingIdsRef.current.has(id)) return
    const proposal = proposalsRef.current.find(p => p.id === id)
    if (!proposal || (proposal.status !== 'proposed' && proposal.status !== 'error')) return

    const gen = generationRef.current
    applyingIdsRef.current.add(id)
    updateProposal(id, { status: 'applying', errorMessage: undefined })

    try {
      if (proposal.type === 'student' && studentId) {
        if (proposal.action === 'append' && proposal.payload) {
          await applyStudentProposalAppend(studentId, proposal.payload as Record<string, unknown>)
        } else {
          await applyStudentProposal(studentId, proposal.field, proposal.newValue)
        }
      } else if (proposal.type === 'session' && studentId && !sessionId) {
        throw new Error('Cannot apply session update: no session is open on this screen.')
      } else if (proposal.type === 'session' && studentId && sessionId) {
        await applySessionProposal(studentId, sessionId, proposal.field, proposal.newValue)
      } else if (proposal.type === 'todo' && studentId) {
        const dueDate = (proposal.payload as { dueDate?: string | null } | null | undefined)?.dueDate ?? null
        await applyTodoProposal(studentId, proposal.newValue, dueDate)
      } else if (proposal.type === 'newStudent') {
        const data = proposal.newStudentPayload as NewStudentData | null | undefined
        if (!data) throw new Error('Student data is missing.')
        if (!data.name?.trim()) throw new Error('Name is required.')
        if (!data.learningLanguage?.trim()) throw new Error('Learning Language is required.')
        if (!data.cefrLevel?.trim()) throw new Error('CEFR Level is required.')
        // Guard against creating a duplicate if the students list is cached
        const cached = queryClient.getQueryData<{ items: Array<{ name: string }> }>(['students'])
        if (cached && data.name) {
          const exists = cached.items.some(
            s => s.name.trim().toLowerCase() === data.name!.trim().toLowerCase()
          )
          if (exists) throw new Error(`A student named "${data.name}" already exists.`)
        }
        const normalizedLearningLanguage = normalizeLanguage(data.learningLanguage)
        if (!normalizedLearningLanguage) {
          throw new Error(`Could not recognize learning language: "${data.learningLanguage}". Please edit it before applying.`)
        }
        const rawNativeLanguages = data.nativeLanguages ?? []
        const badLang = rawNativeLanguages.find(lang => !normalizeLanguage(lang))
        if (badLang) {
          throw new Error(`Could not recognize language: "${badLang}". Please edit it before applying.`)
        }
        const normalizedNativeLanguages = normalizeLanguages(rawNativeLanguages)
        await createStudent({
          name: data.name,
          learningLanguage: normalizedLearningLanguage,
          cefrLevel: data.cefrLevel,
          birthYear: data.birthYear ?? null,
          profession: data.profession ?? null,
          cityOfResidence: data.cityOfResidence ?? null,
          nativeLanguages: normalizedNativeLanguages,
          reasonForStudying: data.reasonForStudying ?? null,
          interests: [],
          learningGoals: [],
          weaknesses: [],
          difficulties: [],
        })
      } else if (proposal.type === 'newSession') {
        if (!studentId) throw new Error('Open from a student\'s screen to schedule a session.')
        const data = proposal.payload as NewSessionData | null | undefined
        if (!data?.title?.trim()) throw new Error('Session title is missing.')
        await applyNewSessionProposal(studentId, data.title, data.sessionDate)
      }
      if (generationRef.current !== gen) return
      updateProposal(id, { status: 'applied' })
      // Invalidate relevant queries so the rest of the UI reflects the change
      if (proposal.type === 'student' && studentId) {
        await queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      } else if (proposal.type === 'session' && studentId && sessionId) {
        await queryClient.invalidateQueries({ queryKey: ['session', studentId, sessionId] })
        await queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
      } else if (proposal.type === 'newStudent') {
        await queryClient.invalidateQueries({ queryKey: ['students'] })
      } else if (proposal.type === 'newSession' && studentId) {
        await queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
      } else if (proposal.type === 'todo' && studentId) {
        await queryClient.invalidateQueries({ queryKey: ['student', studentId] })
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      }
    } catch (err) {
      if (generationRef.current !== gen) return
      const message = err instanceof Error ? err.message : 'Failed to apply change.'
      updateProposal(id, { status: 'error', errorMessage: message })
    } finally {
      applyingIdsRef.current.delete(id)
    }
  }, [studentId, sessionId, updateProposal, queryClient])

  const dismiss = useCallback((id: string) => {
    updateProposal(id, { status: 'dismissed', undoVisible: true })
    const timer = setTimeout(() => {
      updateProposal(id, { undoVisible: false })
      undoTimers.current.delete(id)
    }, 5000)
    undoTimers.current.set(id, timer)
  }, [updateProposal])

  const modifyProposal = useCallback((id: string, newValue: string) => {
    if (!newValue.trim()) return
    setProposals(prev => prev.map(p =>
      p.id === id && p.status === 'proposed' ? { ...p, newValue } : p
    ))
  }, [])

  const undoDismiss = useCallback((id: string) => {
    const timer = undoTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      undoTimers.current.delete(id)
    }
    updateProposal(id, { status: 'proposed', undoVisible: false })
  }, [updateProposal])

  const applyAll = useCallback(async () => {
    const pending = proposalsRef.current.filter(p => p.status === 'proposed')
    for (const p of pending) {
      await apply(p.id)
    }
  }, [apply])

  const dismissAll = useCallback(() => {
    proposalsRef.current.filter(p => p.status === 'proposed').forEach(p => dismiss(p.id))
  }, [dismiss])

  const onEditPayload = useCallback((id: string, payload: NewStudentData | NewSessionData | Record<string, unknown>) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== id) return p
      if (p.type === 'newStudent') return { ...p, newStudentPayload: payload as NewStudentData }
      if (p.type === 'todo') return { ...p, payload: payload as Record<string, unknown> }
      return { ...p, payload: payload as NewSessionData }
    }))
  }, [])

  const reset = useCallback(() => {
    generationRef.current++
    applyingIdsRef.current.clear()
    undoTimers.current.forEach(timer => clearTimeout(timer))
    undoTimers.current.clear()
    setTranscription(null)
    setProcessing(false)
    setProposals([])
  }, [])

  return {
    transcription,
    processing,
    proposals,
    submit,
    apply,
    dismiss,
    undoDismiss,
    modifyProposal,
    applyAll,
    dismissAll,
    reset,
    onEditPayload,
  }
}
