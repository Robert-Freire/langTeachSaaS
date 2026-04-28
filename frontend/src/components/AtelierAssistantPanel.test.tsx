import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AtelierAssistantPanel from './AtelierAssistantPanel'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onCloseDiscarding: vi.fn(),
  studentName: undefined as string | undefined,
  transcription: null as string | null,
  processing: false,
  proposals: [] as ProposalWithStatus[],
  onSubmit: vi.fn(),
  onApply: vi.fn(),
  onDismiss: vi.fn(),
  onUndo: vi.fn(),
  onRetry: vi.fn(),
  onApplyAll: vi.fn(),
  onDismissAll: vi.fn(),
}

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides }
  return { ...render(<AtelierAssistantPanel {...props} />), props }
}

function makeProposal(overrides: Partial<ProposalWithStatus> = {}): ProposalWithStatus {
  return {
    id: 'p1',
    type: 'student',
    field: 'cefrLevel',
    label: 'CEFR Level',
    oldValue: 'A2',
    newValue: 'B1',
    status: 'proposed',
    undoVisible: false,
    ...overrides,
  }
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

  it('shows PROCESSING INSIGHT status when processing', () => {
    renderPanel({ processing: true, transcription: 'some text' })
    expect(screen.getByText(/processing insight/i)).toBeInTheDocument()
  })

  it('disables input and send button when processing', () => {
    renderPanel({ processing: true })
    expect(screen.getByTestId('assistant-input')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
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

  it('shows transcription block and empty proposals message after submission', () => {
    renderPanel({ transcription: 'Worked on present perfect.', proposals: [] })
    expect(screen.getByTestId('transcription-block')).toBeInTheDocument()
    expect(screen.getByText('Worked on present perfect.')).toBeInTheDocument()
    expect(screen.getByText('Proposed Updates')).toBeInTheDocument()
    expect(screen.getByTestId('proposals-empty')).toBeInTheDocument()
  })

  it('shows loading indicator while processing with transcription', () => {
    renderPanel({ transcription: 'some text', processing: true, proposals: [] })
    expect(screen.getByTestId('proposals-loading')).toBeInTheDocument()
  })

  it('renders proposal cards when proposals are provided', () => {
    const proposal = makeProposal()
    renderPanel({ transcription: 'some text', proposals: [proposal] })
    expect(screen.getByTestId('proposals-list')).toBeInTheDocument()
    expect(screen.getByTestId(`proposal-card-${proposal.id}`)).toBeInTheDocument()
  })

  it('shows batch actions footer when there are proposed cards', () => {
    renderPanel({ transcription: 'some text', proposals: [makeProposal({ status: 'proposed' })] })
    expect(screen.getByTestId('batch-actions')).toBeInTheDocument()
    expect(screen.getByTestId('apply-all-btn')).toBeInTheDocument()
    expect(screen.getByTestId('dismiss-all-btn')).toBeInTheDocument()
  })

  it('hides batch actions footer when no proposed cards remain', () => {
    renderPanel({ transcription: 'some text', proposals: [makeProposal({ status: 'applied' })] })
    expect(screen.queryByTestId('batch-actions')).not.toBeInTheDocument()
  })

  it('calls onApplyAll on Apply All Remaining click', async () => {
    const user = userEvent.setup()
    const onApplyAll = vi.fn()
    renderPanel({ transcription: 'text', proposals: [makeProposal()], onApplyAll })
    await user.click(screen.getByTestId('apply-all-btn'))
    expect(onApplyAll).toHaveBeenCalled()
  })

  it('calls onDismissAll on Dismiss All Remaining click', async () => {
    const user = userEvent.setup()
    const onDismissAll = vi.fn()
    renderPanel({ transcription: 'text', proposals: [makeProposal()], onDismissAll })
    await user.click(screen.getByTestId('dismiss-all-btn'))
    expect(onDismissAll).toHaveBeenCalled()
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
