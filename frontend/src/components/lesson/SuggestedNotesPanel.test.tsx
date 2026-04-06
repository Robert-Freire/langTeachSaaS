import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { SuggestedNotesPanel } from './SuggestedNotesPanel'
import type { ExtractedReflection } from '../../api/lessons'

const fullSuggestions: ExtractedReflection = {
  whatWasCovered: 'Past tense verbs',
  areasToImprove: 'Irregular verbs',
  emotionalSignals: 'Student was engaged',
  homeworkAssigned: 'Exercises 1-5',
  nextLessonIdeas: 'Present perfect',
}

describe('SuggestedNotesPanel', () => {
  it('renders all non-null suggestions', () => {
    const onApplyAll = vi.fn()
    render(<SuggestedNotesPanel suggestions={fullSuggestions} onApplyAll={onApplyAll} onDismiss={vi.fn()} />)

    expect(screen.getByTestId('suggestions-panel')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-whatWasCovered')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-emotionalSignals')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-homeworkAssigned')).toBeInTheDocument()
  })

  it('calls onApplyAll with all values when Apply all clicked', () => {
    const onApplyAll = vi.fn()
    render(<SuggestedNotesPanel suggestions={fullSuggestions} onApplyAll={onApplyAll} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByTestId('suggestions-apply-all'))

    expect(onApplyAll).toHaveBeenCalledWith(expect.objectContaining({
      whatWasCovered: 'Past tense verbs',
      areasToImprove: 'Irregular verbs',
      emotionalSignals: 'Student was engaged',
      homeworkAssigned: 'Exercises 1-5',
      nextLessonIdeas: 'Present perfect',
    }))
  })

  it('calls onApplyAll with single field when Use clicked', () => {
    const onApplyAll = vi.fn()
    render(<SuggestedNotesPanel suggestions={fullSuggestions} onApplyAll={onApplyAll} onDismiss={vi.fn()} />)

    fireEvent.click(screen.getByTestId('suggestion-use-whatWasCovered'))

    expect(onApplyAll).toHaveBeenCalledWith({ whatWasCovered: 'Past tense verbs' })
  })

  it('calls onDismiss when X button clicked', () => {
    const onDismiss = vi.fn()
    render(<SuggestedNotesPanel suggestions={fullSuggestions} onApplyAll={vi.fn()} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByTestId('suggestions-dismiss'))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('shows empty state when all suggestions are null', () => {
    const emptySuggestions: ExtractedReflection = {
      whatWasCovered: null,
      areasToImprove: null,
      emotionalSignals: null,
      homeworkAssigned: null,
      nextLessonIdeas: null,
    }
    render(<SuggestedNotesPanel suggestions={emptySuggestions} onApplyAll={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByTestId('suggestions-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('suggestions-panel')).not.toBeInTheDocument()
  })
})
