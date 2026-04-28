import { act, renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAtelierAssistant } from './useAtelierAssistant'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

vi.mock('../api/assistant', () => ({
  proposeAssistant: vi.fn(),
  applyStudentProposal: vi.fn(),
  applySessionProposal: vi.fn(),
  applyTodoProposal: vi.fn(),
  createStudentFromAssistant: vi.fn(),
}))

import * as assistantApi from '../api/assistant'

const mockPropose = vi.mocked(assistantApi.proposeAssistant)
const mockApplyStudent = vi.mocked(assistantApi.applyStudentProposal)
const mockApplySession = vi.mocked(assistantApi.applySessionProposal)
const mockApplyTodo = vi.mocked(assistantApi.applyTodoProposal)
const mockCreateStudent = vi.mocked(assistantApi.createStudentFromAssistant)

const sampleProposals = [
  { id: 'p1', type: 'student' as const, field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B1' },
  { id: 'p2', type: 'session' as const, field: 'title', label: 'Session Title', oldValue: null, newValue: 'Past Perfect' },
  { id: 'p3', type: 'todo' as const, field: 'text', label: 'Teaching Todo', oldValue: null, newValue: 'Review passive voice' },
]

describe('useAtelierAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialises with null transcription, not processing, empty proposals', () => {
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })
    expect(result.current.transcription).toBeNull()
    expect(result.current.processing).toBe(false)
    expect(result.current.proposals).toHaveLength(0)
  })

  it('submit: sets transcription and processing immediately, then populates proposals', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: sampleProposals })
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('We covered past perfect.') })
    expect(result.current.transcription).toBe('We covered past perfect.')
    expect(result.current.processing).toBe(true)

    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.processing).toBe(false)
    expect(result.current.proposals).toHaveLength(3)
    expect(result.current.proposals[0].status).toBe('proposed')
  })

  it('submit: calls proposeAssistant with studentId and sessionId', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Some text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(mockPropose).toHaveBeenCalledWith('Some text', 'student-1', 'session-1')
  })

  it('apply: routes student proposal to applyStudentProposal', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    mockApplyStudent.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('p1') })
    expect(mockApplyStudent).toHaveBeenCalledWith('student-1', 'cefrLevel', 'B1')
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: routes session proposal to applySessionProposal', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[1]] })
    mockApplySession.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('p2') })
    expect(mockApplySession).toHaveBeenCalledWith('student-1', 'session-1', 'title', 'Past Perfect')
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: routes todo proposal to applyTodoProposal', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[2]] })
    mockApplyTodo.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('p3') })
    expect(mockApplyTodo).toHaveBeenCalledWith('student-1', 'Review passive voice')
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: sets error status on failure without affecting other cards', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: sampleProposals.slice(0, 2) })
    mockApplyStudent.mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(2)

    await act(async () => { await result.current.apply('p1') })
    expect(result.current.proposals.find(p => p.id === 'p1')?.status).toBe('error')
    expect(result.current.proposals.find(p => p.id === 'p2')?.status).toBe('proposed')
  })

  it('dismiss: sets status to dismissed and shows undo for 5s then hides', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    act(() => { result.current.dismiss('p1') })
    expect(result.current.proposals[0].status).toBe('dismissed')
    expect(result.current.proposals[0].undoVisible).toBe(true)

    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.proposals[0].undoVisible).toBe(false)
  })

  it('undoDismiss: cancels timer and reverts to proposed', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })

    act(() => { result.current.dismiss('p1') })
    act(() => { result.current.undoDismiss('p1') })
    expect(result.current.proposals[0].status).toBe('proposed')
    expect(result.current.proposals[0].undoVisible).toBe(false)

    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.proposals[0].status).toBe('proposed')
  })

  it('applyAll: applies only proposed cards sequentially', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: sampleProposals.slice(0, 2) })
    mockApplyStudent.mockResolvedValueOnce(undefined)
    mockApplySession.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(2)

    await act(async () => { await result.current.applyAll() })
    expect(result.current.proposals.every(p => p.status === 'applied')).toBe(true)
  })

  it('apply: routes newStudent proposal to createStudentFromAssistant and invalidates students query', async () => {
    const payload = JSON.stringify({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    const newStudentProposal = { id: 'p4', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: payload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })
    mockCreateStudent.mockResolvedValueOnce({ id: 'new-student-id' })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Nueva alumna Sofía') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('p4') })
    expect(mockCreateStudent).toHaveBeenCalledWith({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('onEdit: updates newValue of proposal with matching id', async () => {
    const payload = JSON.stringify({ name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    const newStudentProposal = { id: 'p4', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: payload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })

    const updatedPayload = JSON.stringify({ name: 'Lucía', learningLanguage: 'inglés', cefrLevel: 'B1' })
    act(() => { result.current.onEdit('p4', updatedPayload) })
    expect(result.current.proposals[0].newValue).toBe(updatedPayload)
  })

  it('reset: clears transcription, processing, and proposals', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    act(() => { result.current.reset() })
    expect(result.current.transcription).toBeNull()
    expect(result.current.proposals).toHaveLength(0)
  })
})
