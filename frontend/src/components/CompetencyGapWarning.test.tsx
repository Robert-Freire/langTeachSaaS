import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompetencyGapWarning } from './CompetencyGapWarning'
import { getConstrainedSkills } from '../lib/competency-constraints'

describe('getConstrainedSkills', () => {
  it('detects speaking and listening for "written only"', () => {
    const skills = getConstrainedSkills('Written only. Formal register.')
    expect(skills).toContain('speaking')
    expect(skills).toContain('listening')
  })

  it('detects speaking and listening for "writing only"', () => {
    const skills = getConstrainedSkills('Writing only sessions.')
    expect(skills).toContain('speaking')
    expect(skills).toContain('listening')
  })

  it('detects speaking for "no role-play"', () => {
    const skills = getConstrainedSkills('Hates role-play. Needs formal register.')
    expect(skills).toContain('speaking')
  })

  it('detects speaking for "no speaking"', () => {
    const skills = getConstrainedSkills('No speaking activities please.')
    expect(skills).toContain('speaking')
  })

  it('detects listening for "no listening"', () => {
    const skills = getConstrainedSkills('No listening exercises.')
    expect(skills).toContain('listening')
  })

  it('detects writing for "no writing"', () => {
    const skills = getConstrainedSkills('No writing tasks.')
    expect(skills).toContain('writing')
  })

  it('detects reading for "no reading"', () => {
    const skills = getConstrainedSkills('No reading passages.')
    expect(skills).toContain('reading')
  })

  it('deduplicates skills across multiple patterns', () => {
    const skills = getConstrainedSkills('Written only. No speaking.')
    const speakingCount = skills.filter(s => s === 'speaking').length
    expect(speakingCount).toBe(1)
  })

  it('returns empty array for notes with no skill constraints', () => {
    const skills = getConstrainedSkills('Clara needs formal register. Relocating to Barcelona.')
    expect(skills).toHaveLength(0)
  })

  it('returns empty array for empty notes', () => {
    expect(getConstrainedSkills('')).toHaveLength(0)
  })
})

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

  it('resets dismissed state when teacher notes change', () => {
    const { rerender } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={5} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByTestId('competency-gap-warning')).not.toBeInTheDocument()
    rerender(<CompetencyGapWarning teacherNotes="No speaking. Written only." sessionCount={5} />)
    expect(screen.getByTestId('competency-gap-warning')).toBeInTheDocument()
  })

  it('handles NaN sessionCount safely (treats as 0, no warning)', () => {
    const { container } = render(<CompetencyGapWarning teacherNotes="Written only." sessionCount={NaN} />)
    expect(container.firstChild).toBeNull()
  })
})
