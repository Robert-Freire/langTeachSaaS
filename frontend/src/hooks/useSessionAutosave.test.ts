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
import type { CreateSessionLogRequest } from '../api/sessionLogs'

const BASE_FORM_DATA: CreateSessionLogRequest = {
  sessionDate: '2026-04-14',
  actualContent: 'We reviewed subjunctive',
  previousHomeworkStatus: 'Done',
  isCancelled: false,
  status: 'Confirmed',
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

describe('useSessionAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockCreateSession.mockResolvedValue({ id: 'ses-1' })
    mockUpdateSession.mockResolvedValue({ id: 'ses-1' })
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
    mockCreateSession.mockResolvedValue({ id: 'ses-1' })
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
})
