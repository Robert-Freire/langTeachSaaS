import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VocabularyRenderer } from './VocabularyRenderer'
import type { VocabularyContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<VocabularyContent>): VocabularyContent {
  return {
    items: [
      { word: 'departure', definition: 'The act of leaving', exampleSentence: 'The departure was delayed.' },
      { word: 'arrival', definition: 'The act of arriving', exampleSentence: 'We celebrated her arrival.' },
    ],
    ...overrides,
  }
}

const raw = (c: VocabularyContent) => JSON.stringify(c)

describe('VocabularyRenderer.Preview', () => {
  it('renders all vocabulary items in a table', () => {
    const content = makeContent()
    render(<VocabularyRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('vocabulary-table')).toBeInTheDocument()
    expect(screen.getByText('departure')).toBeInTheDocument()
    expect(screen.getByText('The act of leaving')).toBeInTheDocument()
    expect(screen.getByText('arrival')).toBeInTheDocument()
  })

  it('shows teacher error when parsedContent does not match schema', () => {
    render(<VocabularyRenderer.Preview rawContent="not valid" parsedContent={{}} />)
    expect(screen.getByText(/could not be parsed/)).toBeInTheDocument()
  })
})

describe('VocabularyRenderer.Editor', () => {
  it('renders editable rows for each vocabulary item', () => {
    const content = makeContent()
    render(<VocabularyRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('departure')).toBeInTheDocument()
    expect(screen.getByDisplayValue('The act of leaving')).toBeInTheDocument()
    expect(screen.getByDisplayValue('The departure was delayed.')).toBeInTheDocument()
  })

  it('calls onChange when a word is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<VocabularyRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByDisplayValue('departure'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.items[0].word).toBe('departureX')
  })

  it('calls onChange when a row is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<VocabularyRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('vocab-add-word'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.items).toHaveLength(3)
  })

  it('calls onChange when a row is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<VocabularyRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('vocab-remove-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.items).toHaveLength(1)
    expect(last.items[0].word).toBe('arrival')
  })

  it('shows friendly error instead of raw textarea when parsedContent does not match schema', () => {
    render(<VocabularyRenderer.Editor rawContent="not valid" parsedContent="a string" onChange={vi.fn()} />)
    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('calls onRegenerate from friendly error when Regenerate is clicked', async () => {
    const onRegenerate = vi.fn()
    render(<VocabularyRenderer.Editor rawContent="bad" parsedContent={null} onChange={vi.fn()} onRegenerate={onRegenerate} />)
    await userEvent.click(screen.getByTestId('parse-error-regenerate-btn'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })
})

describe('VocabularyRenderer coerce', () => {
  it('coerces wrapped schema { vocabulary: { items } }', () => {
    const wrapped = { vocabulary: { items: [{ word: 'museo', definition: 'museum' }] } }
    const result = VocabularyRenderer.coerce(wrapped)
    expect(result).toEqual({ items: [{ word: 'museo', definition: 'museum', exampleSentence: undefined }] })
  })

  it('coerces array input to { items }', () => {
    const arr = [{ word: 'casa', definition: 'house' }]
    const result = VocabularyRenderer.coerce(arr)
    expect((result as { items: unknown[] }).items).toHaveLength(1)
  })

  it('coerces near-match field names (term -> word, example -> exampleSentence)', () => {
    const mismatched = { items: [{ term: 'gato', definition: 'cat', example: 'El gato duerme.' }] }
    const result = VocabularyRenderer.coerce(mismatched) as { items: { word: string; exampleSentence: string }[] }
    expect(result.items[0].word).toBe('gato')
    expect(result.items[0].exampleSentence).toBe('El gato duerme.')
  })

  it('returns null for completely unrecognised input', () => {
    expect(VocabularyRenderer.coerce(42)).toBeNull()
    expect(VocabularyRenderer.coerce(null)).toBeNull()
  })
})

describe('VocabularyRenderer.Student', () => {
  it('renders a flashcard for the first item', () => {
    const content = makeContent()
    render(<VocabularyRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('flashcard-container')).toBeInTheDocument()
    expect(screen.getByTestId('flashcard-word')).toHaveTextContent('departure')
    expect(screen.getByTestId('flashcard-progress')).toHaveTextContent('1 / 2')
  })

  it('navigates to next card', async () => {
    const content = makeContent()
    render(<VocabularyRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.click(screen.getByTestId('flashcard-next'))
    expect(screen.getByTestId('flashcard-word')).toHaveTextContent('arrival')
    expect(screen.getByTestId('flashcard-progress')).toHaveTextContent('2 / 2')
  })

  it('navigates back from second card', async () => {
    const content = makeContent()
    render(<VocabularyRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.click(screen.getByTestId('flashcard-next'))
    await userEvent.click(screen.getByTestId('flashcard-prev'))
    expect(screen.getByTestId('flashcard-progress')).toHaveTextContent('1 / 2')
  })

  it('prev button disabled on first card, next button disabled on last card', async () => {
    const content = makeContent()
    render(<VocabularyRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('flashcard-prev')).toBeDisabled()
    expect(screen.getByTestId('flashcard-next')).not.toBeDisabled()

    await userEvent.click(screen.getByTestId('flashcard-next'))
    expect(screen.getByTestId('flashcard-next')).toBeDisabled()
    expect(screen.getByTestId('flashcard-prev')).not.toBeDisabled()
  })

  it('shows empty state when items array is empty', () => {
    const content = makeContent({ items: [] })
    render(<VocabularyRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText('No vocabulary items yet.')).toBeInTheDocument()
  })

  it('shows student error when parsedContent does not match schema', () => {
    render(<VocabularyRenderer.Student rawContent="not valid" parsedContent={42} />)
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
  })
})
