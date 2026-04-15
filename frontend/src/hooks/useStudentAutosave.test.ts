import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { useStudentAutosave } from './useStudentAutosave'
import type { StudentFormData } from '../api/students'

const STUDENT_URL = 'http://localhost:5000/api/students/stu-1'

const server = setupServer(
  http.put(STUDENT_URL, () => HttpResponse.json({ id: 'stu-1' })),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

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

describe('useStudentAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with idle status', () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    expect(result.current.status).toBe('idle')
  })

  it('does not save when studentId is undefined', async () => {
    let callCount = 0
    server.use(
      http.put(STUDENT_URL, () => {
        callCount++
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave(undefined, ref))
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(callCount).toBe(0)
  })

  it('does not save when getFormData returns null (required fields missing)', async () => {
    let callCount = 0
    server.use(
      http.put(STUDENT_URL, () => {
        callCount++
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef(null)
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(callCount).toBe(0)
  })

  it('saveNow calls updateStudent immediately with form data', async () => {
    let capturedBody: unknown
    server.use(
      http.put(STUDENT_URL, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow() })
    await vi.runAllTimersAsync()
    expect(capturedBody).toEqual(BASE_FORM_DATA)
  })

  it('saveNow merges override on top of form data', async () => {
    let capturedBody: unknown
    server.use(
      http.put(STUDENT_URL, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow({ isActive: false }) })
    await vi.runAllTimersAsync()
    expect(capturedBody).toEqual({ ...BASE_FORM_DATA, isActive: false })
  })

  it('scheduleTextSave fires after 400ms debounce', async () => {
    let callCount = 0
    server.use(
      http.put(STUDENT_URL, () => {
        callCount++
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.scheduleTextSave() })
    expect(callCount).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(callCount).toBe(1)
  })

  it('scheduleTextSave resets timer on multiple calls', async () => {
    let callCount = 0
    server.use(
      http.put(STUDENT_URL, () => {
        callCount++
        return HttpResponse.json({ id: 'stu-1' })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    act(() => { result.current.scheduleTextSave() })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(callCount).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(callCount).toBe(1)
  })

  it('transitions status idle -> saving -> saved -> idle', async () => {
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow() })
    expect(result.current.status).toBe('saving')
    // Resolve the network request but don't advance idle timer yet
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.status).toBe('saved')
    // Advance idle timer
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.status).toBe('idle')
  })

  it('sets error status when updateStudent rejects', async () => {
    server.use(
      http.put(STUDENT_URL, () => new HttpResponse(null, { status: 500 })),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow() })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.status).toBe('error')
  })

  it('retries after error (up to 3 times)', async () => {
    let callCount = 0
    server.use(
      http.put(STUDENT_URL, () => {
        callCount++
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const ref = makeGetFormDataRef()
    const { result } = renderHook(() => useStudentAutosave('stu-1', ref))
    act(() => { result.current.saveNow() })
    // 4 total calls: initial + 3 retries
    for (let i = 0; i < 3; i++) {
      await act(async () => { await vi.runAllTimersAsync() })
    }
    expect(callCount).toBe(4)
    expect(result.current.status).toBe('error')
  })
})
