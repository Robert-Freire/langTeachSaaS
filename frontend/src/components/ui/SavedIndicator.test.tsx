import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SavedIndicator } from './SavedIndicator'

describe('SavedIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when visible is false', () => {
    render(<SavedIndicator visible={false} />)
    expect(screen.queryByTestId('saved-indicator')).not.toBeInTheDocument()
  })

  it('shows Check icon and "Saved" text when visible is true', () => {
    render(<SavedIndicator visible={true} />)
    // Advance past the deferred setTimeout(0) that sets shown state
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByTestId('saved-indicator')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('auto-hides after hold + fade duration', () => {
    render(<SavedIndicator visible={true} />)
    act(() => { vi.advanceTimersByTime(0) })  // trigger show
    expect(screen.getByTestId('saved-indicator')).toBeInTheDocument()
    // Advance past hold (1000ms) + fade (300ms)
    act(() => { vi.advanceTimersByTime(1400) })
    expect(screen.queryByTestId('saved-indicator')).not.toBeInTheDocument()
  })

  it('resets immediately when visible goes back to false', () => {
    const { rerender } = render(<SavedIndicator visible={true} />)
    act(() => { vi.advanceTimersByTime(0) })  // trigger show
    expect(screen.getByTestId('saved-indicator')).toBeInTheDocument()
    rerender(<SavedIndicator visible={false} />)
    act(() => { vi.advanceTimersByTime(0) })  // trigger hide
    expect(screen.queryByTestId('saved-indicator')).not.toBeInTheDocument()
  })
})
