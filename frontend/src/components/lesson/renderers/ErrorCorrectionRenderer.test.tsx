import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorCorrectionRenderer } from './ErrorCorrectionRenderer'
import type { ErrorCorrectionContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<ErrorCorrectionContent>): ErrorCorrectionContent {
  return {
    mode: 'identify-and-correct',
    items: [
      {
        sentence: 'Yo soy muy calor',
        errorSpan: [3, 11],
        correction: 'tengo mucho calor',
        errorType: 'grammar',
        explanation: 'Use tener for physical sensations, not ser.',
      },
      {
        sentence: 'Ella tiene hambre mucho',
        errorSpan: [16, 22],
        correction: 'mucha hambre',
        errorType: 'agreement',
        explanation: 'Hambre is feminine; use mucha.',
      },
    ],
    ...overrides,
  }
}

const raw = (c: ErrorCorrectionContent) => JSON.stringify(c)

// ─── Preview ─────────────────────────────────────────────────────────────────

describe('ErrorCorrectionRenderer.Preview', () => {
  it('renders all items', () => {
    const content = makeContent()
    const { container } = render(<ErrorCorrectionRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByTestId('error-correction-preview')).toBeInTheDocument()
    // Sentences are split across spans by SentenceWithHighlight; check textContent of the container
    expect(container.textContent).toContain('Yo soy muy calor')
    expect(container.textContent).toContain('Ella tiene hambre mucho')
  })

  it('shows mode label', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText(/Identify and correct/i)).toBeInTheDocument()
  })

  it('shows corrections and explanations', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText(/tengo mucho calor/)).toBeInTheDocument()
    expect(screen.getByText(/Use tener for physical sensations/)).toBeInTheDocument()
  })

  it('shows error type badges', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('Agreement')).toBeInTheDocument()
  })

  it('renders ContentParseError when content is invalid', () => {
    render(<ErrorCorrectionRenderer.Preview rawContent="{}" parsedContent={{}} />)
    expect(screen.queryByTestId('error-correction-preview')).not.toBeInTheDocument()
  })
})

// ─── Editor ──────────────────────────────────────────────────────────────────

describe('ErrorCorrectionRenderer.Editor', () => {
  it('renders editor with items', () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(
      <ErrorCorrectionRenderer.Editor
        rawContent={raw(content)}
        parsedContent={content}
        onChange={onChange}
      />
    )
    expect(screen.getByTestId('error-correction-editor')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/Sentence with one error/)).toHaveLength(2)
  })

  it('renders mode radio buttons', () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(
      <ErrorCorrectionRenderer.Editor
        rawContent={raw(content)}
        parsedContent={content}
        onChange={onChange}
      />
    )
    expect(screen.getByText(/Identify only/)).toBeInTheDocument()
    expect(screen.getByText(/Identify and correct/)).toBeInTheDocument()
  })

  it('calls onChange when mode is changed', () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(
      <ErrorCorrectionRenderer.Editor
        rawContent={raw(content)}
        parsedContent={content}
        onChange={onChange}
      />
    )
    const radio = screen.getByDisplayValue('identify-only')
    fireEvent.click(radio)
    expect(onChange).toHaveBeenCalledOnce()
    const emitted = JSON.parse(onChange.mock.calls[0][0]) as ErrorCorrectionContent
    expect(emitted.mode).toBe('identify-only')
  })
})

// ─── Student ─────────────────────────────────────────────────────────────────

describe('ErrorCorrectionRenderer.Student', () => {
  it('renders student view', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByTestId('error-correction-student')).toBeInTheDocument()
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
  })

  it('shows correction input in identify-and-correct mode', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getAllByPlaceholderText(/Type the corrected form/)).toHaveLength(2)
  })

  it('does not show correction input in identify-only mode', () => {
    const content = makeContent({ mode: 'identify-only' })
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    expect(screen.queryByPlaceholderText(/Type the corrected form/)).not.toBeInTheDocument()
  })

  it('shows score and try-again after checking', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    fireEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('score-summary')).toBeInTheDocument()
    expect(screen.getByTestId('try-again-btn')).toBeInTheDocument()
  })

  it('shows per-item result feedback after checking', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    fireEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('item-result-0')).toBeInTheDocument()
    expect(screen.getByTestId('item-result-1')).toBeInTheDocument()
  })

  it('resets state after try-again', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    fireEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('score-summary')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('try-again-btn'))
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('score-summary')).not.toBeInTheDocument()
  })

  it('shows 0/N score when no answers given', () => {
    const content = makeContent()
    render(<ErrorCorrectionRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    fireEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('score-summary')).toHaveTextContent('0 / 2')
  })

  it('renders ContentParseError when content is invalid', () => {
    render(<ErrorCorrectionRenderer.Student rawContent="{}" parsedContent={{}} />)
    expect(screen.queryByTestId('error-correction-student')).not.toBeInTheDocument()
  })
})
