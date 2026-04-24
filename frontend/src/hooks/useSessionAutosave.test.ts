import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockCreateSession = vi.fn()
const mockUpdateSession = vi.fn()
vi.mock('../api/sessionLogs', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

import { useSessionAutosave } from './useSessionAutosave'
import type { CreateSessionLogRequest, SessionLog } from '../api/sessionLogs'

const BASE_FORM_DATA: CreateSessionLogRequest = {
  sessionDate: '2026-04-14',
  actualContent: 'We reviewed subjunctive',
  previousHomeworkStatus: 'Done',
  isCancelled: false,
  status: 'Confirmed',
}

function makeSessionLog(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'ses-1',
    studentId: 'stu-1',
    sessionDate: '2026-04-14',
    plannedContent: null,
    actualContent: 'We reviewed subjunctive',
    homeworkAssigned: null,
    previousHomeworkStatus: 1,
    previousHomeworkStatusName: 'Done',
    nextSessionTopics: null,
    generalNotes: null,
    levelReassessmentSkill: null,
    levelReassessmentLevel: null,
    linkedLessonId: null,
    topicTags: '[]',
    createdAt: '2026-04-14T10:00:00Z',
    updatedAt: '2026-04-14T10:00:00Z',
    isCancelled: false,
    status: 1,
    statusName: 'Confirmed',
    mentionedDifficultyPairs: '[]',
    suggestedDifficulties: '[]',
    duration: null,
    title: null,
    hasVoiceNote: false,
    ...overrides,
  }
}

function makeGetFormDataRef(data: CreateSessionLogRequest = BASE_FORM_DATA) {
  const ref = { current: () => data }
  return ref as React.MutableRefObject<(() => CreateSessionLogRequest) | null>
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

// Variant that exposes the QueryClient so tests can inspect the cache.
function makeWrapperWithQc(qc?: QueryClient) {
  const client = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { Wrapper, qc: client }
}

describe('useSessionAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockCreateSession.mockResolvedValue(makeSessionLog())
    mockUpdateSession.mockResolvedValue(makeSessionLog())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with idle status and null sessionId', () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    expect(result.current.status).toBe('idle')
    expect(result.current.sessionId).toBeNull()
  })

  it('does not save when studentId is undefined', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave(undefined, ref), { wrapper: makeWrapper() })
    await act(async () => { await result.current.saveNow() })
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('first saveNow calls createSession and stores sessionId', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    let sid: string | null = null
    await act(async () => { sid = await result.current.saveNow() })
    expect(mockCreateSession).toHaveBeenCalledWith('stu-1', BASE_FORM_DATA)
    expect(mockUpdateSession).not.toHaveBeenCalled()
    expect(sid).toBe('ses-1')
    expect(result.current.sessionId).toBe('ses-1')
  })

  it('second saveNow calls updateSession with stored sessionId', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    await act(async () => { await result.current.saveNow() })
    await act(async () => { await result.current.saveNow() })
    expect(mockCreateSession).toHaveBeenCalledTimes(1)
    expect(mockUpdateSession).toHaveBeenCalledWith('stu-1', 'ses-1', BASE_FORM_DATA)
  })

  it('saveNow merges override on top of form data', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    await act(async () => { await result.current.saveNow({ isCancelled: true }) })
    expect(mockCreateSession).toHaveBeenCalledWith('stu-1', { ...BASE_FORM_DATA, isCancelled: true })
  })

  it('scheduleTextSave fires after 400ms debounce', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.scheduleTextSave() })
    expect(mockCreateSession).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(mockCreateSession).toHaveBeenCalledOnce()
  })

  it('scheduleTextSave resets timer on multiple calls', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mockCreateSession).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mockCreateSession).toHaveBeenCalledOnce()
  })

  it('transitions status saving -> saved after createSession resolves', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    // Use sync act so the outer act completes immediately (saveNow runs fire-and-forget)
    act(() => { void result.current.saveNow() })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.status).toBe('saved')
  })

  it('resets status to idle 2s after a successful save', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { void result.current.saveNow() })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.status).toBe('saved')
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.status).toBe('idle')
  })

  it('sets error status after max retries', async () => {
    mockCreateSession.mockRejectedValue(new Error('Network error'))
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { void result.current.saveNow() })
    for (let i = 0; i < 3; i++) {
      await act(async () => { await vi.runAllTimersAsync() })
    }
    expect(mockCreateSession).toHaveBeenCalledTimes(4) // initial + 3 retries
    expect(result.current.status).toBe('error')
  })

  it('retry does not call updateSession when createSession failed (sessionId still null)', async () => {
    mockCreateSession.mockRejectedValueOnce(new Error('Network error'))
    mockCreateSession.mockResolvedValue(makeSessionLog())
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { void result.current.saveNow() })
    await act(async () => { await vi.runAllTimersAsync() })
    // All calls should be createSession, never updateSession
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it('edit mode: first saveNow calls updateSession when initialSessionId is provided', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: makeWrapper() })
    expect(result.current.sessionId).toBe('existing-ses-id')
    await act(async () => { await result.current.saveNow() })
    expect(mockCreateSession).not.toHaveBeenCalled()
    expect(mockUpdateSession).toHaveBeenCalledWith('stu-1', 'existing-ses-id', BASE_FORM_DATA)
  })

  describe('React Query cache integration', () => {
    it('update success writes the returned SessionLog into the session cache', async () => {
      const updated = makeSessionLog({ id: 'existing-ses-id', title: 'Updated title', updatedAt: '2026-04-14T11:30:00Z' })
      mockUpdateSession.mockResolvedValue(updated)
      const ref = makeGetFormDataRef()
      const { Wrapper, qc } = makeWrapperWithQc()
      const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: Wrapper })
      await act(async () => { await result.current.saveNow() })
      const cached = qc.getQueryData<SessionLog>(['session', 'stu-1', 'existing-ses-id'])
      expect(cached).toEqual(updated)
    })

    it('update success replaces the matching entry in the sessions list cache', async () => {
      const updated = makeSessionLog({ id: 'existing-ses-id', title: 'Fresh title' })
      mockUpdateSession.mockResolvedValue(updated)
      const ref = makeGetFormDataRef()
      const { Wrapper, qc } = makeWrapperWithQc()
      qc.setQueryData<SessionLog[]>(['sessions', 'stu-1'], [
        makeSessionLog({ id: 'other-ses', title: 'Other' }),
        makeSessionLog({ id: 'existing-ses-id', title: 'Old title' }),
      ])
      const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: Wrapper })
      await act(async () => { await result.current.saveNow() })
      const list = qc.getQueryData<SessionLog[]>(['sessions', 'stu-1'])
      expect(list).toHaveLength(2)
      expect(list?.find(s => s.id === 'existing-ses-id')?.title).toBe('Fresh title')
      expect(list?.find(s => s.id === 'other-ses')?.title).toBe('Other')
    })

    it('update success leaves the sessions list alone when no cache entry exists yet', async () => {
      mockUpdateSession.mockResolvedValue(makeSessionLog({ id: 'existing-ses-id' }))
      const ref = makeGetFormDataRef()
      const { Wrapper, qc } = makeWrapperWithQc()
      const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: Wrapper })
      await act(async () => { await result.current.saveNow() })
      // No list in cache, and we don't fabricate one
      expect(qc.getQueryData(['sessions', 'stu-1'])).toBeUndefined()
    })

    it('lastSavedAt reflects the server updatedAt after each successful save', async () => {
      const ref = makeGetFormDataRef()
      const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: makeWrapper() })
      expect(result.current.lastSavedAt).toBeNull()
      mockUpdateSession.mockResolvedValueOnce(makeSessionLog({ id: 'existing-ses-id', updatedAt: '2026-04-14T11:00:00Z' }))
      await act(async () => { await result.current.saveNow() })
      expect(result.current.lastSavedAt).toBe('2026-04-14T11:00:00Z')
      mockUpdateSession.mockResolvedValueOnce(makeSessionLog({ id: 'existing-ses-id', updatedAt: '2026-04-14T11:05:00Z' }))
      await act(async () => { await result.current.saveNow() })
      expect(result.current.lastSavedAt).toBe('2026-04-14T11:05:00Z')
    })

    it('cancels in-flight session queries before mutating to prevent stale refetch overwriting the cache', async () => {
      const ref = makeGetFormDataRef()
      const { Wrapper, qc } = makeWrapperWithQc()
      const cancelSpy = vi.spyOn(qc, 'cancelQueries')
      const { result } = renderHook(() => useSessionAutosave('stu-1', ref, 'existing-ses-id'), { wrapper: Wrapper })
      await act(async () => { await result.current.saveNow() })
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['session', 'stu-1', 'existing-ses-id'] })
    })
  })
})
