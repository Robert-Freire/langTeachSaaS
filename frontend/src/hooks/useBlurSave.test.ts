import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBlurSave } from './useBlurSave'
import { SAVED_VISIBLE_DURATION_MS, ERROR_VISIBLE_DURATION_MS } from '../lib/autosaveConstants'

describe('useBlurSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('savedVisible auto-hides after SAVED_VISIBLE_DURATION_MS', () => {
    const { result } = renderHook(() => useBlurSave())

    expect(result.current.savedVisible).toBe(false)

    act(() => { result.current.onSaveSuccess() })
    expect(result.current.savedVisible).toBe(true)

    act(() => { vi.advanceTimersByTime(SAVED_VISIBLE_DURATION_MS) })
    expect(result.current.savedVisible).toBe(false)
  })

  it('fieldError auto-clears after ERROR_VISIBLE_DURATION_MS', () => {
    const { result } = renderHook(() => useBlurSave())

    expect(result.current.fieldError).toBeNull()

    act(() => { result.current.onSaveError('Failed to save') })
    expect(result.current.fieldError).toBe('Failed to save')

    act(() => { vi.advanceTimersByTime(ERROR_VISIBLE_DURATION_MS) })
    expect(result.current.fieldError).toBeNull()
  })

  it('onSaveSuccess clears existing fieldError', () => {
    const { result } = renderHook(() => useBlurSave())

    act(() => { result.current.onSaveError('Failed to save') })
    expect(result.current.fieldError).toBe('Failed to save')

    act(() => { result.current.onSaveSuccess() })
    expect(result.current.fieldError).toBeNull()
    expect(result.current.savedVisible).toBe(true)
  })

  it('clearError clears fieldError immediately', () => {
    const { result } = renderHook(() => useBlurSave())

    act(() => { result.current.onSaveError('Invalid value') })
    expect(result.current.fieldError).toBe('Invalid value')

    act(() => { result.current.clearError() })
    expect(result.current.fieldError).toBeNull()
  })

  it('timers are cleaned up on unmount (no setState after unmount)', () => {
    const { result, unmount } = renderHook(() => useBlurSave())

    act(() => { result.current.onSaveSuccess() })
    expect(result.current.savedVisible).toBe(true)

    unmount()

    // Advancing time after unmount should not throw
    expect(() => act(() => { vi.advanceTimersByTime(SAVED_VISIBLE_DURATION_MS) })).not.toThrow()
  })
})
