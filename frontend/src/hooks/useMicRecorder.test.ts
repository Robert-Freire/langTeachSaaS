import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMicRecorder } from './useMicRecorder'

const mockGetUserMedia = vi.fn()
Object.defineProperty(window.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
})

class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  mimeType = 'audio/webm'
  state = 'inactive'
  start = vi.fn().mockImplementation(() => { this.state = 'recording' })
  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  })
}
vi.stubGlobal('MediaRecorder', MockMediaRecorder)

function makeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

describe('useMicRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob: vi.fn() }))
    expect(result.current.recording).toBe(false)
    expect(result.current.elapsed).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.startInFlight).toBe(false)
  })

  it('start/stop basic flow: recording becomes true on start, onBlob called on stop', async () => {
    mockGetUserMedia.mockResolvedValue(makeStream())
    const onBlob = vi.fn()
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob }))

    await act(async () => { await result.current.start() })
    expect(result.current.recording).toBe(true)

    await act(async () => { result.current.stop() })
    await waitFor(() => expect(result.current.recording).toBe(false))
    expect(onBlob).toHaveBeenCalledTimes(1)
    expect(onBlob.mock.calls[0][0]).toBeInstanceOf(File)
  })

  it('discard: stop(true) does NOT call onBlob', async () => {
    mockGetUserMedia.mockResolvedValue(makeStream())
    const onBlob = vi.fn()
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob }))

    await act(async () => { await result.current.start() })
    await act(async () => { result.current.stop(true) })

    await waitFor(() => expect(result.current.recording).toBe(false))
    expect(onBlob).not.toHaveBeenCalled()
  })

  it('min duration: stop before minDurationSeconds calls onTooShort, not onBlob', async () => {
    mockGetUserMedia.mockResolvedValue(makeStream())
    const onBlob = vi.fn()
    const onTooShort = vi.fn()
    const { result } = renderHook(() =>
      useMicRecorder({ maxDurationSeconds: 60, minDurationSeconds: 3, onBlob, onTooShort })
    )

    await act(async () => { await result.current.start() })
    // elapsed stays at 0 (no timer ticks in synchronous test)
    await act(async () => { result.current.stop() })

    await waitFor(() => expect(result.current.recording).toBe(false))
    expect(onTooShort).toHaveBeenCalledTimes(1)
    expect(onBlob).not.toHaveBeenCalled()
  })

  it('permission denied: getUserMedia rejects with NotAllowedError sets error', async () => {
    const err = new Error('denied')
    err.name = 'NotAllowedError'
    mockGetUserMedia.mockRejectedValue(err)
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob: vi.fn() }))

    await act(async () => { await result.current.start() })

    expect(result.current.error).toBe('permission-denied')
    expect(result.current.recording).toBe(false)
    expect(result.current.startInFlight).toBe(false)
  })

  it('no hardware: getUserMedia rejects with NotFoundError sets error', async () => {
    const err = new Error('no mic')
    err.name = 'NotFoundError'
    mockGetUserMedia.mockRejectedValue(err)
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob: vi.fn() }))

    await act(async () => { await result.current.start() })

    expect(result.current.error).toBe('no-hardware')
  })

  it('clearError resets the error state', async () => {
    const err = new Error('denied')
    err.name = 'NotAllowedError'
    mockGetUserMedia.mockRejectedValue(err)
    const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob: vi.fn() }))

    await act(async () => { await result.current.start() })
    expect(result.current.error).toBe('permission-denied')

    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
  })

  describe('timer-dependent behaviour', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('auto-stop at maxDurationSeconds: onBlob called without explicit stop', async () => {
      mockGetUserMedia.mockResolvedValue(makeStream())
      const onBlob = vi.fn()
      const { result } = renderHook(() => useMicRecorder({ maxDurationSeconds: 3, onBlob }))

      await act(async () => { await result.current.start() })
      expect(result.current.recording).toBe(true)

      // Advance timer to trigger auto-stop; mock recorder fires onstop synchronously
      act(() => { vi.advanceTimersByTime(3000) })

      expect(result.current.recording).toBe(false)
      expect(onBlob).toHaveBeenCalledTimes(1)
    })

    it('durationWarning becomes true at warnAtSecondsRemaining threshold', async () => {
      mockGetUserMedia.mockResolvedValue(makeStream())
      const { result } = renderHook(() =>
        useMicRecorder({ maxDurationSeconds: 60, warnAtSecondsRemaining: 10, onBlob: vi.fn() })
      )

      await act(async () => { await result.current.start() })
      expect(result.current.durationWarning).toBe(false)

      act(() => { vi.advanceTimersByTime(50000) })
      expect(result.current.durationWarning).toBe(true)
    })
  })

  it('cleanup on unmount: stream tracks are stopped', async () => {
    const stopTrack = vi.fn()
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(stream)
    const { result, unmount } = renderHook(() => useMicRecorder({ maxDurationSeconds: 60, onBlob: vi.fn() }))

    await act(async () => { await result.current.start() })
    unmount()

    expect(stopTrack).toHaveBeenCalled()
  })
})
