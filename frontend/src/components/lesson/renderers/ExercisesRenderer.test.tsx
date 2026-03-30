import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExercisesRenderer } from './ExercisesRenderer'
import type { ExercisesContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<ExercisesContent>): ExercisesContent {
  return {
    fillInBlank: [
      { sentence: 'She ___ to the store.', answer: 'went', hint: "past of 'go'" },
    ],
    multipleChoice: [
      { question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad' },
    ],
    matching: [
      { left: 'hello', right: 'hola' },
      { left: 'goodbye', right: 'adios' },
    ],
    ...overrides,
  }
}

const raw = (c: ExercisesContent) => JSON.stringify(c)

describe('ExercisesRenderer.Preview', () => {
  it('renders fill-in-blank, multiple choice, and matching sections', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('exercises-preview')).toBeInTheDocument()
    expect(screen.getByText(/She.*store/)).toBeInTheDocument()
    expect(screen.getByText('Which word means happy?')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('replaces ___ with visual blank in preview', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText(/\[/)).toBeInTheDocument()
  })

  it('shows teacher error when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Preview rawContent="not valid" parsedContent={{}} />)
    expect(screen.getByText(/could not be parsed/)).toBeInTheDocument()
  })
})

describe('ExercisesRenderer.Editor', () => {
  it('renders exercises-editor with all three sections', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('exercises-editor')).toBeInTheDocument()
    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument()
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
    expect(screen.getByText('Matching')).toBeInTheDocument()
  })

  it('calls onChange when fill-in-blank sentence is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByDisplayValue("She ___ to the store."), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.fillInBlank[0].sentence).toBe('She ___ to the store.X')
  })

  it('calls onChange when a fill-in-blank item is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    const addButtons = screen.getAllByText('+ Add item')
    await userEvent.click(addButtons[0])
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.fillInBlank).toHaveLength(2)
  })

  it('calls onChange when a multiple choice question is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByText('+ Add question'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.multipleChoice).toHaveLength(2)
  })

  it('calls onChange when a matching pair is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByText('+ Add pair'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.matching).toHaveLength(3)
  })

  it('shows friendly error instead of raw textarea when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Editor rawContent="not valid" parsedContent="a string" onChange={vi.fn()} />)
    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('ExercisesRenderer coerce', () => {
  it('coerces missing arrays to empty arrays', () => {
    const partial = { fillInBlank: [{ sentence: 'S', answer: 'A' }] }
    const result = ExercisesRenderer.coerce(partial) as { fillInBlank: unknown[]; multipleChoice: unknown[]; matching: unknown[] }
    expect(result.fillInBlank).toHaveLength(1)
    expect(result.multipleChoice).toEqual([])
    expect(result.matching).toEqual([])
  })

  it('returns null for completely unrecognised input', () => {
    expect(ExercisesRenderer.coerce('bad')).toBeNull()
  })
})

describe('ExercisesRenderer.Student', () => {
  it('renders fill-in-blank inputs and check answers button', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('exercises-student')).toBeInTheDocument()
    expect(screen.getByTestId('fib-input-0')).toBeInTheDocument()
    expect(screen.getByTestId('mc-option-0-0')).toBeInTheDocument()
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
  })

  it('shows score after checking correct answers', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('mc-option-0-1')) // 'glad'
    await userEvent.click(screen.getByTestId('match-left-0'))
    await userEvent.click(screen.getByText('hola'))
    await userEvent.click(screen.getByTestId('match-left-1'))
    await userEvent.click(screen.getByText('adios'))

    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('score-summary')).toHaveTextContent('You got 4 / 4 correct')
    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✓')
  })

  it('shows wrong answer feedback after checking', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'wrong')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('score-summary')).toHaveTextContent('You got 0 / 4 correct')
  })

  it('try again resets the form', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    await userEvent.click(screen.getByTestId('try-again-btn'))

    expect(screen.getByTestId('fib-input-0')).toHaveValue('')
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
  })

  it('shows student error when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Student rawContent="not valid" parsedContent={42} />)
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
  })

  it('shows explanation below wrong fill-in-blank answer', async () => {
    const content = makeContent({
      fillInBlank: [{ sentence: 'She ___ to the store.', answer: 'went', hint: "past of 'go'", explanation: 'Use past simple "went" here.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'go')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('fib-explanation-0')).toHaveTextContent('Use past simple "went" here.')
  })

  it('shows explanation below wrong multiple choice answer', async () => {
    const content = makeContent({
      multipleChoice: [{ question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad', explanation: '"Glad" is a synonym for happy.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.click(screen.getByTestId('mc-option-0-0')) // 'sad' — wrong
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('mc-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('mc-explanation-0')).toHaveTextContent('"Glad" is a synonym for happy.')
  })

  it('does not show explanation when answer is correct', async () => {
    const content = makeContent({
      fillInBlank: [{ sentence: 'She ___ to the store.', answer: 'went', explanation: 'Use past simple.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✓')
    expect(screen.queryByTestId('fib-explanation-0')).not.toBeInTheDocument()
  })

  it('shows explanation for wrong matching answer', async () => {
    const content = makeContent({
      matching: [
        { left: 'hello', right: 'hola', explanation: '"Hola" is the Spanish greeting for "hello".' },
        { left: 'goodbye', right: 'adios' },
      ],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    // Pair "hello" with "adios" (wrong) and leave "goodbye" unpaired
    await userEvent.click(screen.getByTestId('match-left-0'))
    await userEvent.click(screen.getByText('adios'))
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('match-explanation-0')).toHaveTextContent('"Hola" is the Spanish greeting')
  })

  it('gracefully shows only correct answer when explanation is absent', async () => {
    const content = makeContent() // no explanation fields
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'wrong')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗ went')
    expect(screen.queryByTestId('fib-explanation-0')).not.toBeInTheDocument()
  })
})

describe('ExercisesRenderer stage grouping', () => {
  it('Preview shows stage headers when items have stage fields', () => {
    const content = makeContent({
      fillInBlank: [
        { sentence: 'She ___ to the store.', answer: 'went', stage: 'controlled' },
        { sentence: 'I ___ hungry.', answer: 'am', stage: 'meaningful' },
      ],
    })
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('stage-header-controlled')).toBeInTheDocument()
    expect(screen.getByTestId('stage-header-meaningful')).toBeInTheDocument()
  })

  it('Preview renders without stage headers when no items have stage fields', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.queryByTestId('stage-header-controlled')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stage-header-meaningful')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stage-header-guided_free')).not.toBeInTheDocument()
  })
})
