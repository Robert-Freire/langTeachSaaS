import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuidedWritingRenderer } from './GuidedWritingRenderer'

const validContent = {
  situation: 'Write an email to a friend describing your last holiday.',
  requiredStructures: ['pretérito indefinido', 'ir a + infinitivo'],
  wordCount: { min: 80, max: 130 },
  evaluationCriteria: ['Uses target structures correctly', 'Meets word count'],
  modelAnswer: 'Querida Ana, te escribo para contarte mis vacaciones...',
  tips: ['Start by saying where you went', 'Use past tense for events'],
}

describe('GuidedWritingRenderer.Editor', () => {
  it('renders situation field with content', () => {
    render(
      <GuidedWritingRenderer.Editor
        parsedContent={validContent}
        rawContent={JSON.stringify(validContent)}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('guided-writing-situation')).toHaveValue(validContent.situation)
  })

  it('renders model answer field', () => {
    render(
      <GuidedWritingRenderer.Editor
        parsedContent={validContent}
        rawContent={JSON.stringify(validContent)}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('guided-writing-model-answer')).toHaveValue(validContent.modelAnswer)
  })

  it('calls onChange when situation changes', () => {
    const onChange = vi.fn()
    render(
      <GuidedWritingRenderer.Editor
        parsedContent={validContent}
        rawContent={JSON.stringify(validContent)}
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByTestId('guided-writing-situation'), { target: { value: 'New situation' } })
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('New situation'))
  })
})

describe('GuidedWritingRenderer.Student', () => {
  it('renders situation text', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    expect(screen.getByText(validContent.situation)).toBeTruthy()
  })

  it('does NOT show model answer initially', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    expect(screen.queryByTestId('guided-writing-model-revealed')).toBeNull()
  })

  it('reveals model answer after clicking reveal button', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    fireEvent.click(screen.getByTestId('guided-writing-reveal-model'))
    expect(screen.getByTestId('guided-writing-model-revealed')).toBeTruthy()
    expect(screen.getByText(validContent.modelAnswer)).toBeTruthy()
  })

  it('updates word count as user types', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    fireEvent.change(screen.getByTestId('guided-writing-textarea'), {
      target: { value: 'Hello world this is a test' },
    })
    expect(screen.getByTestId('guided-writing-word-count').textContent).toContain('6')
  })

  it('shows zero word count when textarea is empty', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    expect(screen.getByTestId('guided-writing-word-count').textContent).toContain('0')
  })

  it('shows target word count range', () => {
    render(<GuidedWritingRenderer.Student parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    expect(screen.getByTestId('guided-writing-word-count').textContent).toContain('80')
    expect(screen.getByTestId('guided-writing-word-count').textContent).toContain('130')
  })
})

describe('GuidedWritingRenderer.Preview', () => {
  it('renders situation and model answer', () => {
    render(<GuidedWritingRenderer.Preview parsedContent={validContent} rawContent={JSON.stringify(validContent)} />)
    expect(screen.getByText(validContent.situation)).toBeTruthy()
    expect(screen.getByTestId('guided-writing-model-answer-preview')).toBeTruthy()
  })
})
