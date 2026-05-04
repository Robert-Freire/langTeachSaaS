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
  applyStudentProposalAppend: vi.fn(),
  applySessionProposal: vi.fn(),
  applyTodoProposal: vi.fn(),
  applyNewSessionProposal: vi.fn(),
}))

vi.mock('../api/students', () => ({
  createStudent: vi.fn(),
}))

import * as assistantApi from '../api/assistant'
import * as studentsApi from '../api/students'

const mockPropose = vi.mocked(assistantApi.proposeAssistant)
const mockApplyStudent = vi.mocked(assistantApi.applyStudentProposal)
const mockApplyStudentAppend = vi.mocked(assistantApi.applyStudentProposalAppend)
const mockApplySession = vi.mocked(assistantApi.applySessionProposal)
const mockApplyTodo = vi.mocked(assistantApi.applyTodoProposal)
const mockApplyNewSession = vi.mocked(assistantApi.applyNewSessionProposal)
const mockCreateStudent = vi.mocked(studentsApi.createStudent)

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

  it('apply: routes student append proposal to applyStudentProposalAppend', async () => {
    const appendPayload = { appendInterests: ['Flamenco', 'Cine de Almodóvar'] }
    const appendProposal = {
      id: 'pa1', type: 'student' as const, field: 'interests', label: 'Interests',
      oldValue: null, newValue: 'Flamenco, Cine de Almodóvar', action: 'append' as const,
      payload: appendPayload,
    }
    mockPropose.mockResolvedValueOnce({ proposals: [appendProposal] })
    mockApplyStudentAppend.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('pa1') })
    expect(mockApplyStudentAppend).toHaveBeenCalledWith('student-1', appendPayload)
    expect(mockApplyStudent).not.toHaveBeenCalled()
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

  it('apply: routes newStudent proposal to createStudent and invalidates students query', async () => {
    const studentPayload = { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' }
    const newStudentProposal = { id: 'p4', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })
    mockCreateStudent.mockResolvedValueOnce({
      id: 'new-student-id', name: 'Sofía', learningLanguage: 'inglés',
      level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
      languages: { nativeLanguages: [], spokenLanguages: [] },
      identity: { birthYear: null, age: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
      profile: { interests: [], personalNotes: null, teachingNotes: null, learningGoals: [], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
      commercial: { isActive: true, isCorporate: false, rate: null },
      createdAt: '', updatedAt: '',
    })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Nueva alumna Sofía') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('p4') })
    expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sofía', learningLanguage: 'English', cefrLevel: 'B1' }))
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: normalizes Spanish language names to canonical English before creating student', async () => {
    const studentPayload = { name: 'María', learningLanguage: 'inglés', nativeLanguages: ['castellano'], cefrLevel: 'B1' }
    const newStudentProposal = { id: 'p5', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'María', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })
    mockCreateStudent.mockResolvedValueOnce({
      id: 'new-id', name: 'María', learningLanguage: 'English',
      level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
      languages: { nativeLanguages: ['Spanish'], spokenLanguages: [] },
      identity: { birthYear: null, age: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
      profile: { interests: [], personalNotes: null, teachingNotes: null, learningGoals: [], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
      commercial: { isActive: true, isCorporate: false, rate: null },
      createdAt: '', updatedAt: '',
    })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Nueva alumna María') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('p5') })
    expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({
      learningLanguage: 'English',
      nativeLanguages: ['Spanish'],
    }))
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: English-only input passes through without normalization regression', async () => {
    const studentPayload = { name: 'John', learningLanguage: 'Spanish', nativeLanguages: ['English'], cefrLevel: 'A2' }
    const newStudentProposal = { id: 'p6', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'John', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })
    mockCreateStudent.mockResolvedValueOnce({
      id: 'new-id', name: 'John', learningLanguage: 'Spanish',
      level: { cefrLevel: 'A2', officialCefrLevel: null, skillLevelOverrides: {} },
      languages: { nativeLanguages: ['English'], spokenLanguages: [] },
      identity: { birthYear: null, age: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
      profile: { interests: [], personalNotes: null, teachingNotes: null, learningGoals: [], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
      commercial: { isActive: true, isCorporate: false, rate: null },
      createdAt: '', updatedAt: '',
    })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('New student John') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('p6') })
    expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({
      learningLanguage: 'Spanish',
      nativeLanguages: ['English'],
    }))
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: mixed Spanish aliases and canonical English in nativeLanguages both normalize correctly', async () => {
    const studentPayload = { name: 'María', learningLanguage: 'Spanish', nativeLanguages: ['Portuguese', 'castellano'], cefrLevel: 'B2' }
    const newStudentProposal = { id: 'p8', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'María', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })
    mockCreateStudent.mockResolvedValueOnce({
      id: 'new-id', name: 'María', learningLanguage: 'Spanish',
      level: { cefrLevel: 'B2', officialCefrLevel: null, skillLevelOverrides: {} },
      languages: { nativeLanguages: ['Portuguese', 'Spanish'], spokenLanguages: [] },
      identity: { birthYear: null, age: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
      profile: { interests: [], personalNotes: null, teachingNotes: null, learningGoals: [], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
      commercial: { isActive: true, isCorporate: false, rate: null },
      createdAt: '', updatedAt: '',
    })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Nueva alumna María') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('p8') })
    expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({
      learningLanguage: 'Spanish',
      nativeLanguages: ['Portuguese', 'Spanish'],
    }))
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: unrecognized language name sets proposal to error with offending value', async () => {
    const studentPayload = { name: 'Test', learningLanguage: 'klingon', cefrLevel: 'B1' }
    const newStudentProposal = { id: 'p7', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'Test', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Nueva alumna Test') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('p7') })
    expect(result.current.proposals[0].status).toBe('error')
    expect(result.current.proposals[0].errorMessage).toContain('klingon')
    expect(mockCreateStudent).not.toHaveBeenCalled()
  })

  it('onEditPayload: updates payload of proposal with matching id', async () => {
    const studentPayload = { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' }
    const newStudentProposal = { id: 'p4', type: 'newStudent' as const, field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía', newStudentPayload: studentPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newStudentProposal] })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })

    const updatedPayload = { name: 'Lucía', learningLanguage: 'inglés', cefrLevel: 'B1' }
    act(() => { result.current.onEditPayload('p4', updatedPayload) })
    expect(result.current.proposals[0].newStudentPayload).toEqual(updatedPayload)
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

  it('modifyProposal: updates newValue on a proposed card', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals[0].newValue).toBe('B1')

    act(() => { result.current.modifyProposal('p1', 'B2') })
    expect(result.current.proposals[0].newValue).toBe('B2')
    expect(result.current.proposals[0].status).toBe('proposed')
  })

  it('modifyProposal: no-op on dismissed card', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    act(() => { result.current.dismiss('p1') })
    act(() => { result.current.modifyProposal('p1', 'B2') })

    expect(result.current.proposals[0].newValue).toBe('B1')
    expect(result.current.proposals[0].status).toBe('dismissed')
  })

  it('modifyProposal: no-op when newValue is empty', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })
    act(() => { result.current.modifyProposal('p1', '  ') })

    expect(result.current.proposals[0].newValue).toBe('B1')
  })

  it('submit follow-up: merges proposed card in place (updates newValue, keeps id)', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('first message') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)
    expect(result.current.proposals[0].id).toBe('p1')
    expect(result.current.proposals[0].newValue).toBe('B1')

    const followUp = [{ id: 'px', type: 'student' as const, field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B2' }]
    mockPropose.mockResolvedValueOnce({ proposals: followUp })
    act(() => { result.current.submit('actually B2') })
    await act(async () => { await vi.runAllTimersAsync() })

    expect(result.current.proposals).toHaveLength(1)
    expect(result.current.proposals[0].id).toBe('p1')
    expect(result.current.proposals[0].newValue).toBe('B2')
  })

  it('submit follow-up: appends new proposal not matched by type+field', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0]] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('first') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    const followUp = [{ id: 'px', type: 'session' as const, field: 'title', label: 'Session Title', oldValue: null, newValue: 'New Title' }]
    mockPropose.mockResolvedValueOnce({ proposals: followUp })
    act(() => { result.current.submit('also set title') })
    await act(async () => { await vi.runAllTimersAsync() })

    expect(result.current.proposals).toHaveLength(2)
    expect(result.current.proposals[1].field).toBe('title')
    expect(result.current.proposals[1].status).toBe('proposed')
  })

  it('submit follow-up: always appends todo cards (type+field not unique)', async () => {
    const firstTodo = { id: 'pt1', type: 'todo' as const, field: 'text', label: 'Teaching Todo', oldValue: null, newValue: 'Review passive voice' }
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[0], firstTodo] })
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('first') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(2)

    const secondTodo = { id: 'pt2', type: 'todo' as const, field: 'text', label: 'Teaching Todo', oldValue: null, newValue: 'Practice subjunctive' }
    mockPropose.mockResolvedValueOnce({ proposals: [secondTodo] })
    act(() => { result.current.submit('also add another todo') })
    await act(async () => { await vi.runAllTimersAsync() })

    const todos = result.current.proposals.filter(p => p.type === 'todo')
    expect(todos).toHaveLength(2)
    expect(todos.find(p => p.newValue === 'Review passive voice')).toBeDefined()
    expect(todos.find(p => p.newValue === 'Practice subjunctive')).toBeDefined()
  })

  it('submit follow-up: does not re-propose applied card', async () => {
    mockPropose.mockResolvedValueOnce({ proposals: sampleProposals.slice(0, 2) })
    mockApplyStudent.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('first') })
    await act(async () => { await vi.runAllTimersAsync() })
    await act(async () => { await result.current.apply('p1') })
    expect(result.current.proposals[0].status).toBe('applied')

    const followUp = [{ id: 'px', type: 'student' as const, field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'C1' }]
    mockPropose.mockResolvedValueOnce({ proposals: followUp })
    act(() => { result.current.submit('actually C1') })
    await act(async () => { await vi.runAllTimersAsync() })

    const cefrCard = result.current.proposals.find(p => p.type === 'student' && p.field === 'cefrLevel')
    expect(cefrCard?.status).toBe('applied')
    expect(cefrCard?.newValue).toBe('B1')
  })

  it('apply: routes newSession proposal to applyNewSessionProposal and invalidates sessions query', async () => {
    const sessionPayload = { title: 'Subjunctive', sessionDate: '2026-05-12' }
    const newSessionProposal = { id: 'ps1', type: 'newSession' as const, field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive', payload: sessionPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newSessionProposal] })
    mockApplyNewSession.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Next Monday I want to do a session on the subjunctive') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.proposals).toHaveLength(1)

    await act(async () => { await result.current.apply('ps1') })
    expect(mockApplyNewSession).toHaveBeenCalledWith('student-1', 'Subjunctive', '2026-05-12')
    expect(result.current.proposals[0].status).toBe('applied')
  })

  it('apply: newSession fails gracefully with error status when studentId is null', async () => {
    const sessionPayload = { title: 'Subjunctive', sessionDate: '2026-05-12' }
    const newSessionProposal = { id: 'ps1', type: 'newSession' as const, field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive', payload: sessionPayload }
    mockPropose.mockResolvedValueOnce({ proposals: [newSessionProposal] })

    const { result } = renderHook(() => useAtelierAssistant(null, null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('Schedule a session') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('ps1') })
    expect(mockApplyNewSession).not.toHaveBeenCalled()
    expect(result.current.proposals[0].status).toBe('error')
  })

  it('apply: session proposal invalidates session-summary query', async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    mockPropose.mockResolvedValueOnce({ proposals: [sampleProposals[1]] })
    mockApplySession.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAtelierAssistant('student-1', 'session-1'), { wrapper: makeWrapper() })

    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('p2') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session-summary', 'student-1'] })
    invalidateSpy.mockRestore()
  })

  it('apply: routes skillLevel.writing student proposal to applyStudentProposal with dotted field', async () => {
    const skillProposal = { id: 'psk1', type: 'student' as const, field: 'skillLevel.writing', label: 'Writing Level', oldValue: null, newValue: 'B1' }
    mockPropose.mockResolvedValueOnce({ proposals: [skillProposal] })
    mockApplyStudent.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAtelierAssistant('student-1', null), { wrapper: makeWrapper() })
    act(() => { result.current.submit('text') })
    await act(async () => { await vi.runAllTimersAsync() })

    await act(async () => { await result.current.apply('psk1') })
    expect(mockApplyStudent).toHaveBeenCalledWith('student-1', 'skillLevel.writing', 'B1')
    expect(result.current.proposals[0].status).toBe('applied')
  })
})
