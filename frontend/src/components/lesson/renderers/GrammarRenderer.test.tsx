import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GrammarRenderer } from './GrammarRenderer'
import type { GrammarContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<GrammarContent>): GrammarContent {
  return {
    title: 'Past Perfect Tense',
    explanation: 'Used to show an action completed before another past action.',
    examples: [
      { sentence: 'She had left before he arrived.', note: 'Action completed first' },
    ],
    commonMistakes: ['Using past simple instead of past perfect'],
    ...overrides,
  }
}

const raw = (c: GrammarContent) => JSON.stringify(c)

describe('GrammarRenderer.Preview', () => {
  it('renders title, explanation, examples, and common mistakes', () => {
    const content = makeContent()
    render(<GrammarRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Past Perfect Tense')).toBeInTheDocument()
    expect(screen.getByText('Used to show an action completed before another past action.')).toBeInTheDocument()
    expect(screen.getByText('She had left before he arrived.')).toBeInTheDocument()
    expect(screen.getByText('Action completed first')).toBeInTheDocument()
    expect(screen.getByText('Using past simple instead of past perfect')).toBeInTheDocument()
  })

  it('shows teacher error when isGrammarContent returns false', () => {
    render(<GrammarRenderer.Preview rawContent="not json" parsedContent={null} />)
    expect(screen.getByText(/could not be parsed/)).toBeInTheDocument()
  })
})

describe('GrammarRenderer.Editor', () => {
  it('renders editable fields for title, explanation, examples, and mistakes', () => {
    const content = makeContent()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('grammar-title-input')).toHaveValue('Past Perfect Tense')
    expect(screen.getByTestId('grammar-explanation-input')).toHaveValue('Used to show an action completed before another past action.')
    expect(screen.getByTestId('grammar-example-sentence-0')).toHaveValue('She had left before he arrived.')
    expect(screen.getByTestId('grammar-mistake-input-0')).toHaveValue('Using past simple instead of past perfect')
  })

  it('calls onChange when title is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByTestId('grammar-title-input'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.title).toBe('Past Perfect TenseX')
  })

  it('calls onChange when an example is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('grammar-add-example'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.examples).toHaveLength(2)
  })

  it('calls onChange when an example is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('grammar-remove-example-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.examples).toHaveLength(0)
  })

  it('calls onChange when a mistake is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('grammar-add-mistake'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.commonMistakes).toHaveLength(2)
  })

  it('shows friendly error instead of raw textarea when isGrammarContent returns false', () => {
    render(<GrammarRenderer.Editor rawContent="not json" parsedContent={null} onChange={vi.fn()} />)
    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('GrammarRenderer coerce', () => {
  it('coerces wrapped schema { grammar: { title, ... } }', () => {
    const wrapped = { grammar: makeContent() }
    const result = GrammarRenderer.coerce(wrapped) as GrammarContent
    expect(result.title).toBe('Past Perfect Tense')
  })

  it('coerces near-match field names (mistakes -> commonMistakes)', () => {
    const mismatched = {
      title: 'T',
      explanation: 'E',
      examples: [],
      mistakes: ['oops'],
    }
    const result = GrammarRenderer.coerce(mismatched) as GrammarContent
    expect(result.commonMistakes).toEqual(['oops'])
  })

  it('returns null for completely unrecognised input', () => {
    expect(GrammarRenderer.coerce(42)).toBeNull()
  })
})

describe('GrammarRenderer.Student', () => {
  it('renders title, explanation, examples, and common mistakes', () => {
    const content = makeContent()
    render(<GrammarRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Past Perfect Tense')).toBeInTheDocument()
    expect(screen.getByText('Used to show an action completed before another past action.')).toBeInTheDocument()
    expect(screen.getByText('She had left before he arrived.')).toBeInTheDocument()
    expect(screen.getByText('Watch out!')).toBeInTheDocument()
    expect(screen.getByText('Using past simple instead of past perfect')).toBeInTheDocument()
  })

  it('shows student error when isGrammarContent returns false', () => {
    render(<GrammarRenderer.Student rawContent="not json" parsedContent={null} />)
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
  })

  it('shows L1 callout when l1ContrastiveNote is present', () => {
    const content = makeContent({
      l1ContrastiveNote: {
        l1Example: 'Sono stanco',
        targetExample: 'Estoy cansado',
        explanation: 'Tiredness is a temporary state in Spanish, so estar is required.',
        interferencePattern: 'ser-estar',
      },
    })
    render(<GrammarRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('grammar-student-l1-note')).toBeInTheDocument()
    expect(screen.getByText('Sono stanco')).toBeInTheDocument()
    expect(screen.getByText('Estoy cansado')).toBeInTheDocument()
    expect(screen.getByText('Tiredness is a temporary state in Spanish, so estar is required.')).toBeInTheDocument()
  })

  it('hides L1 callout when l1ContrastiveNote is absent', () => {
    const content = makeContent()
    render(<GrammarRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.queryByTestId('grammar-student-l1-note')).not.toBeInTheDocument()
  })
})

describe('GrammarRenderer.Preview', () => {
  it('shows L1 note callout when l1ContrastiveNote is present', () => {
    const content = makeContent({
      l1ContrastiveNote: {
        l1Example: 'Sono stanco',
        targetExample: 'Estoy cansado',
        explanation: 'Tiredness is a temporary state.',
        interferencePattern: 'ser-estar',
      },
    })
    render(<GrammarRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('grammar-preview-l1-note')).toBeInTheDocument()
    expect(screen.getByText('Sono stanco')).toBeInTheDocument()
  })

  it('hides L1 note callout when l1ContrastiveNote is absent', () => {
    const content = makeContent()
    render(<GrammarRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.queryByTestId('grammar-preview-l1-note')).not.toBeInTheDocument()
  })
})

describe('GrammarRenderer.Editor — L1 note section', () => {
  it('shows collapsed L1 note toggle button', () => {
    const content = makeContent()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('grammar-l1-note-toggle')).toBeInTheDocument()
  })

  it('expands L1 note editor when content has l1ContrastiveNote', () => {
    const content = makeContent({
      l1ContrastiveNote: {
        l1Example: 'Sono stanco',
        targetExample: 'Estoy cansado',
        explanation: 'State vs identity.',
        interferencePattern: 'ser-estar',
      },
    })
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('grammar-l1-note-editor')).toBeInTheDocument()
    expect(screen.getByTestId('grammar-l1-example-input')).toHaveValue('Sono stanco')
  })

  it('calls onChange when l1Example is edited', async () => {
    const content = makeContent({
      l1ContrastiveNote: {
        l1Example: 'Sono stanco',
        targetExample: 'Estoy cansado',
        explanation: 'State vs identity.',
        interferencePattern: 'ser-estar',
      },
    })
    const onChange = vi.fn()
    render(<GrammarRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByTestId('grammar-l1-example-input'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.l1ContrastiveNote.l1Example).toBe('Sono stancoX')
  })
})
