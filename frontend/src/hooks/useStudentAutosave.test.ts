import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUpdateStudent = vi.fn()
vi.mock('../api/students', () => ({
  updateStudent: (...args: unknown[]) => mockUpdateStudent(...args),
}))

import { useStudentAutosave } from './useStudentAutosave'
import type { StudentFormData } from '../api/students'

const BASE_FORM_DATA: StudentFormData = {
  name: 'Ana',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: [],
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
}

function makeGetFormDataRef(data: StudentFormData | null = BASE_FORM_DATA) {
  const ref = { current: data === null ? null : () => data }
  return ref as React.MutableRefObject<(() => StudentFormData | null) | null>
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useStudentAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockUpdateStudent.mockResolvedValue({ id: 'stu-1' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with idle status', () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    expect(result.current.status).toBe('idle')
  })

  it('does not save when studentId is undefined', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave(undefined, ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(mockUpdateStudent).not.toHaveBeenCalled()
  })

  it('does not save when getFormData returns null (required fields missing)', async () => {
    const ref = makeGetFormDataRef(null)
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(mockUpdateStudent).not.toHaveBeenCalled()
  })

  it('saveNow calls updateStudent immediately with form data', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(mockUpdateStudent).toHaveBeenCalledWith('stu-1', BASE_FORM_DATA)
  })

  it('saveNow merges override on top of form data', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow({ isActive: false }) })
    await vi.runAllTimersAsync()
    expect(mockUpdateStudent).toHaveBeenCalledWith('stu-1', { ...BASE_FORM_DATA, isActive: false })
  })

  it('scheduleTextSave fires after 400ms debounce', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.scheduleTextSave() })
    expect(mockUpdateStudent).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(mockUpdateStudent).toHaveBeenCalledOnce()
  })

  it('scheduleTextSave resets timer on multiple calls', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mockUpdateStudent).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mockUpdateStudent).toHaveBeenCalledOnce()
  })

  it('transitions status saving -> saved after updateStudent resolves', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    // Flush the resolved promise — status should be 'saved'
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.status).toBe('saved')
  })

  it('resets status to idle 2s after a successful save', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.status).toBe('saved')
    // Advance idle timer
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.status).toBe('idle')
  })

  it('sets error status when updateStudent rejects', async () => {
    mockUpdateStudent.mockRejectedValue(new Error('Network error'))
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.status).toBe('error')
  })

  it('retries after error (up to 3 times)', async () => {
    mockUpdateStudent.mockRejectedValue(new Error('Network error'))
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref), { wrapper: makeWrapper() })
    act(() => { result.current.saveNow() })
    // 4 total calls: initial + 3 retries
    for (let i = 0; i < 3; i++) {
      await act(async () => { await vi.runAllTimersAsync() })
    }
    expect(mockUpdateStudent).toHaveBeenCalledTimes(4)
    expect(result.current.status).toBe('error')
  })
})
