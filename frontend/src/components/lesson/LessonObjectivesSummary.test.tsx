import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LessonObjectivesSummary } from './LessonObjectivesSummary'

describe('LessonObjectivesSummary', () => {
  const sampleObjectives =
    'Grammar: present tense -ar/-er/-ir. Communicative skills: reading,speaking. CEFR skill focus: EO,CO'

  it('renders pills for each parsed objective', () => {
    render(<LessonObjectivesSummary objectives={sampleObjectives} studentName="Marco" />)

    const pills = screen.getByTestId('objectives-pills')
    expect(pills.children).toHaveLength(3)
    expect(pills).toHaveTextContent('Grammar: present tense -ar/-er/-ir')
    expect(pills).toHaveTextContent('Communicative skills: reading,speaking')
    expect(pills).toHaveTextContent('CEFR skill focus: EO,CO')
  })

  it('renders summary with student name', () => {
    render(<LessonObjectivesSummary objectives={sampleObjectives} studentName="Marco" />)

    const summary = screen.getByTestId('objectives-summary-text')
    expect(summary).toHaveTextContent('Helps Marco practice')
  })

  it('renders generic summary when no student name', () => {
    render(<LessonObjectivesSummary objectives={sampleObjectives} studentName={null} />)

    const summary = screen.getByTestId('objectives-summary-text')
    expect(summary).toHaveTextContent('Lesson objectives')
  })

  it('renders nothing when objectives is null', () => {
    const { container } = render(
      <LessonObjectivesSummary objectives={null} studentName="Marco" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when objectives is empty string', () => {
    const { container } = render(
      <LessonObjectivesSummary objectives="" studentName="Marco" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when objectives is only whitespace', () => {
    const { container } = render(
      <LessonObjectivesSummary objectives="   " studentName="Marco" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('applies correct color styles per category', () => {
    render(<LessonObjectivesSummary objectives={sampleObjectives} studentName={null} />)

    const pills = screen.getByTestId('objectives-pills')
    const grammarPill = pills.children[0] as HTMLElement
    const commPill = pills.children[1] as HTMLElement
    const cefrPill = pills.children[2] as HTMLElement

    expect(grammarPill.className).toContain('indigo')
    expect(commPill.className).toContain('emerald')
    expect(cefrPill.className).toContain('amber')
  })

  it('handles single objective without trailing period', () => {
    render(
      <LessonObjectivesSummary objectives="Vocabulary: daily routines" studentName={null} />
    )

    const pills = screen.getByTestId('objectives-pills')
    expect(pills.children).toHaveLength(1)
    expect(pills).toHaveTextContent('Vocabulary: daily routines')
  })

  it('has the container testid for integration tests', () => {
    render(<LessonObjectivesSummary objectives={sampleObjectives} studentName={null} />)
    expect(screen.getByTestId('lesson-objectives-summary')).toBeInTheDocument()
  })
})
