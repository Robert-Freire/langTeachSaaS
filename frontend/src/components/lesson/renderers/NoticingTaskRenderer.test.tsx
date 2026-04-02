import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NoticingTaskRenderer } from './NoticingTaskRenderer'
import type { NoticingTaskContent } from '../../../types/contentTypes'

const validContent: NoticingTaskContent = {
  text: 'Ayer Maria fue al mercado y compro frutas.',
  instruction: 'Find all verbs in the past tense.',
  targets: [
    { form: 'fue', position: [11, 14], grammar: 'GR-08' },
    { form: 'compro', position: [28, 34], grammar: 'GR-08' },
  ],
  discoveryQuestions: [
    'How many past tense verbs can you find?',
    'What ending pattern do you notice?',
  ],
  teacherNotes: 'Focus on preterito indefinido irregular forms.',
}

const rawContent = JSON.stringify(validContent, null, 2)

describe('NoticingTaskRenderer.Editor', () => {
  it('renders text and instruction fields', () => {
    render(
      <NoticingTaskRenderer.Editor
        parsedContent={validContent}
        rawContent={rawContent}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue(validContent.instruction)).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Instruction')).toBeInTheDocument()
  })

  it('renders target fields', () => {
    render(
      <NoticingTaskRenderer.Editor
        parsedContent={validContent}
        rawContent={rawContent}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue('fue')).toBeInTheDocument()
    expect(screen.getByDisplayValue('compro')).toBeInTheDocument()
  })

  it('renders discovery questions', () => {
    render(
      <NoticingTaskRenderer.Editor
        parsedContent={validContent}
        rawContent={rawContent}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue('How many past tense verbs can you find?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('What ending pattern do you notice?')).toBeInTheDocument()
  })

  it('calls onChange when text is modified', () => {
    const onChange = vi.fn()
    render(
      <NoticingTaskRenderer.Editor
        parsedContent={validContent}
        rawContent={rawContent}
        onChange={onChange}
      />,
    )

    const textArea = screen.getByDisplayValue(validContent.text)
    fireEvent.change(textArea, { target: { value: 'New text' } })

    expect(onChange).toHaveBeenCalled()
    const parsedArg = JSON.parse(onChange.mock.calls[0][0])
    expect(parsedArg.text).toBe('New text')
  })

  it('shows parse error for invalid content', () => {
    render(
      <NoticingTaskRenderer.Editor
        parsedContent={null}
        rawContent="invalid json"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
  })
})

describe('NoticingTaskRenderer.Preview', () => {
  it('shows highlighted targets', () => {
    render(<NoticingTaskRenderer.Preview parsedContent={validContent} rawContent={rawContent} />)

    // Instruction shown
    expect(screen.getByText(validContent.instruction)).toBeInTheDocument()

    // Target forms shown (in both text and legend)
    expect(screen.getAllByText('fue').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('compro').length).toBeGreaterThanOrEqual(1)
  })

  it('shows discovery questions', () => {
    render(<NoticingTaskRenderer.Preview parsedContent={validContent} rawContent={rawContent} />)

    expect(screen.getByText('How many past tense verbs can you find?')).toBeInTheDocument()
    expect(screen.getByText('What ending pattern do you notice?')).toBeInTheDocument()
  })

  it('shows teacher notes', () => {
    render(<NoticingTaskRenderer.Preview parsedContent={validContent} rawContent={rawContent} />)

    expect(
      screen.getByText('Focus on preterito indefinido irregular forms.'),
    ).toBeInTheDocument()
  })

  it('shows parse error for invalid content', () => {
    render(<NoticingTaskRenderer.Preview parsedContent={null} rawContent="bad" />)

    expect(screen.getByText(/could not be parsed/i)).toBeInTheDocument()
  })
})

describe('NoticingTaskRenderer.Student', () => {
  it('hides teacher notes', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    expect(
      screen.queryByText('Focus on preterito indefinido irregular forms.'),
    ).not.toBeInTheDocument()
  })

  it('shows instruction and discovery questions', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    expect(screen.getByText(validContent.instruction)).toBeInTheDocument()
    expect(screen.getByText('How many past tense verbs can you find?')).toBeInTheDocument()
  })

  it('has interactive clickable words', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    // Words should be clickable (have role="button")
    const buttons = screen.getAllByRole('button')
    // At least the Check button plus clickable words
    expect(buttons.length).toBeGreaterThan(1)
  })

  it('shows Check button', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    expect(screen.getByText('Check')).toBeInTheDocument()
  })

  it('shows feedback after checking answers', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    fireEvent.click(screen.getByText('Check'))

    // Should show feedback about targets found
    expect(screen.getByText(/targets/i)).toBeInTheDocument()
  })

  it('shows Try Again after checking', () => {
    render(<NoticingTaskRenderer.Student parsedContent={validContent} rawContent={rawContent} />)

    fireEvent.click(screen.getByText('Check'))

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })
})
