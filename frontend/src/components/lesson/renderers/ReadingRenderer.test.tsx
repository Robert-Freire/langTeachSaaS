import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ReadingRenderer } from './ReadingRenderer'
import type { ReadingContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<ReadingContent>): ReadingContent {
  return {
    passage: 'Smartphones have changed the way we communicate.',
    comprehensionQuestions: [
      { question: 'How have smartphones changed communication?', answer: 'They allow instant messaging.', type: 'detail' },
    ],
    vocabularyHighlights: [
      { word: 'ubiquitous', definition: 'Found everywhere; very common.' },
    ],
    ...overrides,
  }
}

const raw = (c: ReadingContent) => JSON.stringify(c)

describe('ReadingRenderer.Preview', () => {
  it('renders passage, questions, and vocabulary highlights', () => {
    const content = makeContent()
    render(<ReadingRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Smartphones have changed the way we communicate.')).toBeInTheDocument()
    expect(screen.getByText('How have smartphones changed communication?')).toBeInTheDocument()
    expect(screen.getByText('Answer: They allow instant messaging.')).toBeInTheDocument()
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
    expect(screen.getByText(/Found everywhere/)).toBeInTheDocument()
  })

  it('falls back to raw text when isReadingContent returns false', () => {
    render(<ReadingRenderer.Preview rawContent="not json" parsedContent={null} />)
    expect(screen.getByText('not json')).toBeInTheDocument()
  })
})

describe('ReadingRenderer.Editor', () => {
  it('renders editable fields for passage, questions, and highlights', () => {
    const content = makeContent()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('reading-passage-input')).toHaveValue('Smartphones have changed the way we communicate.')
    expect(screen.getByTestId('reading-question-0')).toHaveValue('How have smartphones changed communication?')
    expect(screen.getByTestId('reading-question-answer-0')).toHaveValue('They allow instant messaging.')
    expect(screen.getByTestId('reading-highlight-word-0')).toHaveValue('ubiquitous')
    expect(screen.getByTestId('reading-highlight-def-0')).toHaveValue('Found everywhere; very common.')
  })

  it('calls onChange when passage is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByTestId('reading-passage-input'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.passage).toBe('Smartphones have changed the way we communicate.X')
  })

  it('calls onChange when a question is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('reading-add-question'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.comprehensionQuestions).toHaveLength(2)
  })

  it('calls onChange when a question is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('reading-remove-question-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.comprehensionQuestions).toHaveLength(0)
  })

  it('calls onChange when a highlight is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('reading-add-highlight'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.vocabularyHighlights).toHaveLength(2)
  })

  it('calls onChange when a highlight is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ReadingRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('reading-remove-highlight-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.vocabularyHighlights).toHaveLength(0)
  })

  it('falls back to raw textarea when isReadingContent returns false', () => {
    render(<ReadingRenderer.Editor rawContent="not json" parsedContent={null} onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('not json')
  })
})

describe('ReadingRenderer.Student', () => {
  it('renders passage, questions, and vocabulary highlights', () => {
    const content = makeContent()
    render(<ReadingRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Smartphones have changed the way we communicate.')).toBeInTheDocument()
    expect(screen.getByText('How have smartphones changed communication?')).toBeInTheDocument()
    expect(screen.getByText('Key Vocabulary')).toBeInTheDocument()
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
  })

  it('falls back to raw text when isReadingContent returns false', () => {
    render(<ReadingRenderer.Student rawContent="not json" parsedContent={null} />)
    expect(screen.getByText('not json')).toBeInTheDocument()
  })
})
