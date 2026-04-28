import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  applySessionProposal,
  applyStudentProposal,
  applyTodoProposal,
  type ProposalDto,
  proposeAssistant,
} from '../api/assistant'

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
  applyAll: () => void
  dismissAll: () => void
  reset: () => void
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

  const updateProposal = useCallback((id: string, patch: Partial<ProposalWithStatus>) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }, [])

  const submit = useCallback(async (text: string) => {
    setTranscription(text)
    setProcessing(true)
    setProposals([])
    try {
      const { proposals: raw } = await proposeAssistant(
        text,
        studentId ?? undefined,
        sessionId ?? undefined,
      )
      setProposals(raw.map(p => ({ ...p, status: 'proposed', undoVisible: false })))
    } catch {
      // Error state shown via empty proposals list; processing clears
    } finally {
      setProcessing(false)
    }
  }, [studentId, sessionId])

  const apply = useCallback(async (id: string) => {
    const proposal = proposals.find(p => p.id === id)
    if (!proposal || (proposal.status !== 'proposed' && proposal.status !== 'error')) return

    updateProposal(id, { status: 'applying', errorMessage: undefined })

    try {
      if (proposal.type === 'student' && studentId) {
        await applyStudentProposal(studentId, proposal.field, proposal.newValue)
      } else if (proposal.type === 'session' && studentId && sessionId) {
        await applySessionProposal(studentId, sessionId, proposal.field, proposal.newValue)
      } else if (proposal.type === 'todo' && studentId) {
        await applyTodoProposal(studentId, proposal.newValue)
      }
      updateProposal(id, { status: 'applied' })
      // Invalidate relevant queries so the rest of the UI reflects the change
      if (proposal.type === 'student' && studentId) {
        await queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      } else if (proposal.type === 'session' && studentId && sessionId) {
        await queryClient.invalidateQueries({ queryKey: ['session', studentId, sessionId] })
        await queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply change.'
      updateProposal(id, { status: 'error', errorMessage: message })
    }
  }, [proposals, studentId, sessionId, updateProposal])

  const dismiss = useCallback((id: string) => {
    updateProposal(id, { status: 'dismissed', undoVisible: true })
    const timer = setTimeout(() => {
      updateProposal(id, { undoVisible: false })
      undoTimers.current.delete(id)
    }, 5000)
    undoTimers.current.set(id, timer)
  }, [updateProposal])

  const undoDismiss = useCallback((id: string) => {
    const timer = undoTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      undoTimers.current.delete(id)
    }
    updateProposal(id, { status: 'proposed', undoVisible: false })
  }, [updateProposal])

  const applyAll = useCallback(async () => {
    const pending = proposals.filter(p => p.status === 'proposed')
    for (const p of pending) {
      await apply(p.id)
    }
  }, [proposals, apply])

  const dismissAll = useCallback(() => {
    proposals.filter(p => p.status === 'proposed').forEach(p => dismiss(p.id))
  }, [proposals, dismiss])

  const reset = useCallback(() => {
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
    applyAll,
    dismissAll,
    reset,
  }
}
