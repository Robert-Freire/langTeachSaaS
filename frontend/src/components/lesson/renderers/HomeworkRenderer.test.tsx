import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { HomeworkRenderer } from './HomeworkRenderer'
import type { HomeworkContent } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<HomeworkContent>): HomeworkContent {
  return {
    tasks: [
      {
        type: 'Vocabulary in Context',
        instructions: 'Fill in the blanks with the correct word from the lesson.',
        examples: ['The ___ was very helpful.', 'We need to ___ our flight.'],
      },
    ],
    ...overrides,
  }
}

const raw = (c: HomeworkContent) => JSON.stringify(c)

describe('HomeworkRenderer.Preview', () => {
  it('renders task type, instructions, and examples', () => {
    const content = makeContent()
    render(<HomeworkRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Vocabulary in Context')).toBeInTheDocument()
    expect(screen.getByText('Fill in the blanks with the correct word from the lesson.')).toBeInTheDocument()
    expect(screen.getByText('The ___ was very helpful.')).toBeInTheDocument()
    expect(screen.getByText('We need to ___ our flight.')).toBeInTheDocument()
  })

  it('renders multiple tasks', () => {
    const content = makeContent({
      tasks: [
        { type: 'Type A', instructions: 'Instruction A', examples: ['Ex A'] },
        { type: 'Type B', instructions: 'Instruction B', examples: ['Ex B'] },
      ],
    })
    render(<HomeworkRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Type A')).toBeInTheDocument()
    expect(screen.getByText('Type B')).toBeInTheDocument()
  })

  it('falls back to raw text when parsedContent does not match schema', () => {
    render(<HomeworkRenderer.Preview rawContent="not valid" parsedContent={{}} />)
    expect(screen.getByText('not valid')).toBeInTheDocument()
  })
})

describe('HomeworkRenderer.Editor', () => {
  it('renders editable fields for type, instructions, and examples', () => {
    const content = makeContent()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('homework-task-type-0')).toHaveValue('Vocabulary in Context')
    expect(screen.getByTestId('homework-task-instructions-0')).toHaveValue('Fill in the blanks with the correct word from the lesson.')
    expect(screen.getByTestId('homework-task-0-example-0')).toHaveValue('The ___ was very helpful.')
  })

  it('calls onChange when task type is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByTestId('homework-task-type-0'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.tasks[0].type).toBe('Vocabulary in ContextX')
  })

  it('calls onChange when a task is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('homework-add-task'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.tasks).toHaveLength(2)
  })

  it('calls onChange when a task is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('homework-remove-task-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.tasks).toHaveLength(0)
  })

  it('calls onChange when an example is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('homework-add-example-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.tasks[0].examples).toHaveLength(3)
  })

  it('calls onChange when an example is removed', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<HomeworkRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByTestId('homework-remove-example-0-0'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.tasks[0].examples).toHaveLength(1)
  })

  it('falls back to raw textarea when parsedContent does not match schema', () => {
    render(<HomeworkRenderer.Editor rawContent="not valid" parsedContent="a string" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('not valid')
  })
})

describe('HomeworkRenderer.Student', () => {
  it('renders all tasks with type, instructions, and examples', () => {
    const content = makeContent()
    render(<HomeworkRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByText('Vocabulary in Context')).toBeInTheDocument()
    expect(screen.getByText('Fill in the blanks with the correct word from the lesson.')).toBeInTheDocument()
    expect(screen.getByText('The ___ was very helpful.')).toBeInTheDocument()
    expect(screen.getByText('We need to ___ our flight.')).toBeInTheDocument()
  })

  it('renders task number labels', () => {
    const content = makeContent()
    render(<HomeworkRenderer.Student rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText('Task 1:')).toBeInTheDocument()
  })

  it('falls back to raw text when parsedContent does not match schema', () => {
    render(<HomeworkRenderer.Student rawContent="not valid" parsedContent={42} />)
    expect(screen.getByText('not valid')).toBeInTheDocument()
  })
})
