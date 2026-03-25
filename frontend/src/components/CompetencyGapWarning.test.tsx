import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompetencyGapWarning } from './CompetencyGapWarning'

describe('CompetencyGapWarning', () => {
  it('shows warning for "written only" with 5 sessions', () => {
    render(<CompetencyGapWarning teacherNotes="Written only. Formal register." sessionCount={5} />)
    expect(screen.getByTestId('competency-gap-warning')).toBeInTheDocument()
    expect(screen.getByText(/speaking/)).toBeInTheDocument()
    expect(screen.getByText(/listening/)).toBeInTheDocument()
  })

  it('shows warning for "no role-play" with 5 sessions', () => {
    render(<CompetencyGapWarning teacherNotes="Hates role-play." sessionCount={5} />)
    expect(screen.getByTestId('competency-gap-warning')).toBeInTheDocument()
  })

  it('does NOT show when sessionCount < 3', () => {
    const { container } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={2} />)
    expect(container.firstChild).toBeNull()
  })

  it('does NOT show for empty notes', () => {
    const { container } = render(<CompetencyGapWarning teacherNotes="" sessionCount={5} />)
    expect(container.firstChild).toBeNull()
  })

  it('does NOT show when no skill-removing keywords found', () => {
    const { container } = render(<CompetencyGapWarning teacherNotes="Formal register. Relocating to Barcelona." sessionCount={10} />)
    expect(container.firstChild).toBeNull()
  })

  it('is dismissable via the X button', () => {
    render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={5} />)
    expect(screen.getByTestId('competency-gap-warning')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByTestId('competency-gap-warning')).not.toBeInTheDocument()
  })

  it('resets dismissed state when constrained skills change', () => {
    const { rerender } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={5} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByTestId('competency-gap-warning')).not.toBeInTheDocument()
    // Adding a new skill constraint resets the warning
    rerender(<CompetencyGapWarning teacherNotes="Written only. No reading." sessionCount={5} />)
    expect(screen.getByTestId('competency-gap-warning')).toBeInTheDocument()
  })

  it('does NOT reset dismissed state on minor text edit that keeps same skills', () => {
    const { rerender } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={5} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByTestId('competency-gap-warning')).not.toBeInTheDocument()
    // Appending punctuation does not change the skill set, so dismissed stays
    rerender(<CompetencyGapWarning teacherNotes="Written only. Formal register." sessionCount={5} />)
    expect(screen.queryByTestId('competency-gap-warning')).not.toBeInTheDocument()
  })

  it('handles NaN sessionCount safely (treats as 0, no warning)', () => {
    const { container } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={NaN} />)
    expect(container.firstChild).toBeNull()
  })
})
