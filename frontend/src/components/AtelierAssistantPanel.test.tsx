import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AtelierAssistantPanel from './AtelierAssistantPanel'

function renderPanel(overrides: Partial<Parameters<typeof AtelierAssistantPanel>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onCloseDiscarding: vi.fn(),
    studentName: undefined,
    transcription: null,
    onSubmit: vi.fn(),
    ...overrides,
  }
  return { ...render(<AtelierAssistantPanel {...props} />), props }
}

describe('AtelierAssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header: title, status indicator, and close button', () => {
    renderPanel()
    expect(screen.getByText('Atelier Assistant')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close assistant/i })).toBeInTheDocument()
  })

  it('renders empty state with generic prompt when no student name', () => {
    renderPanel({ transcription: null, studentName: undefined })
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/What would you like to cover today/i)).toBeInTheDocument()
  })

  it('renders empty state with student name when provided', () => {
    renderPanel({ transcription: null, studentName: 'Ana' })
    expect(screen.getByText(/What did you cover with Ana today/i)).toBeInTheDocument()
  })

  it('renders text input and send button', () => {
    renderPanel()
    expect(screen.getByTestId('assistant-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('calls onSubmit and clears input on Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderPanel({ onSubmit })
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Worked on the subjunctive')
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('Worked on the subjunctive')
    expect(input).toHaveValue('')
  })

  it('calls onSubmit and clears input on send button click', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderPanel({ onSubmit })
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Vocabulary review')
    await user.click(screen.getByTestId('assistant-send-btn'))
    expect(onSubmit).toHaveBeenCalledWith('Vocabulary review')
    expect(input).toHaveValue('')
  })

  it('send button is disabled when input is empty', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('shows transcription block and proposals stub after submission', () => {
    renderPanel({ transcription: 'Worked on present perfect.' })
    expect(screen.getByTestId('transcription-block')).toBeInTheDocument()
    expect(screen.getByText('Worked on present perfect.')).toBeInTheDocument()
    expect(screen.getByText('Proposed Updates')).toBeInTheDocument()
    expect(screen.getByText('(coming soon)')).toBeInTheDocument()
  })

  it('shows transcription in italic blockquote style', () => {
    renderPanel({ transcription: 'Some text here.' })
    const block = screen.getByTestId('transcription-block')
    expect(block.tagName.toLowerCase()).toBe('blockquote')
    expect(block.className).toContain('italic')
  })

  it('calls onClose immediately on X click when no transcription', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ transcription: null, onClose })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows inline discard confirm on X click when transcription exists', async () => {
    const user = userEvent.setup()
    renderPanel({ transcription: 'Some content.' })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('calls onCloseDiscarding and hides confirm when Discard pressed', async () => {
    const user = userEvent.setup()
    const onCloseDiscarding = vi.fn()
    renderPanel({ transcription: 'Some content.', onCloseDiscarding })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    await user.click(screen.getByTestId('discard-confirm-yes'))
    expect(onCloseDiscarding).toHaveBeenCalled()
  })

  it('hides confirm and keeps panel open when Keep editing pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ transcription: 'Some content.', onClose })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
    await user.click(screen.getByTestId('discard-confirm-cancel'))
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    renderPanel({ open: false })
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })
})
