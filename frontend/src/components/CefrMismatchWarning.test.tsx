import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CefrMismatchWarning } from './CefrMismatchWarning'

describe('CefrMismatchWarning', () => {
  it('shows warning when gap is 2 or more', () => {
    render(<CefrMismatchWarning studentName="Ana" studentLevel="A1" lessonLevel="B2" />)
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(screen.getByText(/A1/)).toBeInTheDocument()
    expect(screen.getByText(/B2/)).toBeInTheDocument()
  })

  it('does not show warning when gap is 1', () => {
    const { container } = render(<CefrMismatchWarning studentName="Ana" studentLevel="B1" lessonLevel="B2" />)
    expect(container.firstChild).toBeNull()
  })

  it('does not show warning when gap is 0', () => {
    const { container } = render(<CefrMismatchWarning studentName="Ana" studentLevel="B2" lessonLevel="B2" />)
    expect(container.firstChild).toBeNull()
  })

  it('includes correct direction (above) in warning text', () => {
    render(<CefrMismatchWarning studentName="Ana" studentLevel="A1" lessonLevel="C1" />)
    expect(screen.getByText(/above/)).toBeInTheDocument()
  })

  it('includes correct direction (below) in warning text', () => {
    render(<CefrMismatchWarning studentName="Ana" studentLevel="C1" lessonLevel="A1" />)
    expect(screen.getByText(/below/)).toBeInTheDocument()
  })

  it('is dismissable via the X button', () => {
    render(<CefrMismatchWarning studentName="Ana" studentLevel="A1" lessonLevel="C2" />)
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument()
  })

  it('returns 0 warning for unknown student level', () => {
    const { container } = render(<CefrMismatchWarning studentName="Ana" studentLevel={undefined} lessonLevel="C1" />)
    expect(container.firstChild).toBeNull()
  })
})
