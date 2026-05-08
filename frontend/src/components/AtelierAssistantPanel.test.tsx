import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import AtelierAssistantPanel from './AtelierAssistantPanel'
import type { VoiceNote } from '@/api/voiceNotes'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'

// ---------------------------------------------------------------------------
// MediaDevices mock
// ---------------------------------------------------------------------------
const originalMediaDevices = window.navigator.mediaDevices
const mockGetUserMedia = vi.fn()
Object.defineProperty(window.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
})

// ---------------------------------------------------------------------------
// MediaRecorder mock
// ---------------------------------------------------------------------------
class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  mimeType = 'audio/webm;codecs=opus'
  state: 'inactive' | 'recording' = 'inactive'
  start = vi.fn().mockImplementation(() => { this.state = 'recording' })
  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  })
}
vi.stubGlobal('MediaRecorder', MockMediaRecorder)

afterAll(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: originalMediaDevices,
    configurable: true,
  })
})

// ---------------------------------------------------------------------------
// uploadVoiceNote mock
// ---------------------------------------------------------------------------
vi.mock('@/api/voiceNotes', () => ({
  uploadVoiceNote: vi.fn(),
}))
import { uploadVoiceNote } from '@/api/voiceNotes'
const mockUpload = uploadVoiceNote as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// assistant API mock (keeps all exports, replaces submitVoiceFeedback)
// ---------------------------------------------------------------------------
vi.mock('@/api/assistant', async () => {
  const actual = await vi.importActual<typeof import('@/api/assistant')>('@/api/assistant')
  return { ...actual, submitVoiceFeedback: vi.fn().mockResolvedValue(undefined) }
})

const SAMPLE_NOTE: VoiceNote = {
  id: 'note-1',
  originalFileName: 'recording.webm',
  contentType: 'audio/webm',
  sizeBytes: 1024,
  durationSeconds: 5,
  transcription: 'Past perfect with Ana.',
  transcribedAt: '2026-04-28T10:00:05Z',
  createdAt: '2026-04-28T10:00:00Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

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
  onModify: vi.fn(),
  onApplyAll: vi.fn(),
  onDismissAll: vi.fn(),
  onEditPayload: vi.fn(),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AtelierAssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserMedia.mockResolvedValue(makeStream())
    mockUpload.mockResolvedValue(SAMPLE_NOTE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- header / status -------------------------------------------------------

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

  // ---- empty state ------------------------------------------------------------

  it('renders empty state with generic prompt when no student name', () => {
    renderPanel({ transcription: null, studentName: undefined })
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/What would you like to cover today/i)).toBeInTheDocument()
  })

  it('renders empty state with student name when provided', () => {
    renderPanel({ transcription: null, studentName: 'Ana' })
    expect(screen.getByText(/What did you cover with Ana today/i)).toBeInTheDocument()
  })

  // ---- text input -------------------------------------------------------------

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

  // ---- transcription + proposals ----------------------------------------------

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

  // ---- close / discard --------------------------------------------------------

  it('calls onClose immediately when no proposals and not processing', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ proposals: [], processing: false, onClose })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose immediately when all proposals are dismissed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({
      proposals: [makeProposal({ status: 'dismissed' }), makeProposal({ id: 'p2', status: 'dismissed' })],
      onClose,
    })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose immediately when all proposals are applied', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({
      proposals: [makeProposal({ status: 'applied' }), makeProposal({ id: 'p2', status: 'applied' })],
      onClose,
    })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose immediately when proposals are mix of applied and dismissed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({
      proposals: [makeProposal({ status: 'applied' }), makeProposal({ id: 'p2', status: 'dismissed' })],
      onClose,
    })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows discard confirm when at least one proposal is pending', async () => {
    const user = userEvent.setup()
    renderPanel({ proposals: [makeProposal({ status: 'proposed' })] })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('shows discard confirm when processing (LLM call in flight)', async () => {
    const user = userEvent.setup()
    renderPanel({ processing: true, proposals: [] })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('calls onCloseDiscarding when Discard pressed with pending proposal', async () => {
    const user = userEvent.setup()
    const onCloseDiscarding = vi.fn()
    renderPanel({ proposals: [makeProposal({ status: 'proposed' })], onCloseDiscarding })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    await user.click(screen.getByTestId('discard-confirm-yes'))
    expect(onCloseDiscarding).toHaveBeenCalled()
  })

  it('hides confirm and keeps panel open when Keep editing pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ proposals: [makeProposal({ status: 'proposed' })], onClose })
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    await user.click(screen.getByTestId('discard-confirm-cancel'))
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows discard confirm when closing while recording and pending proposals exist', async () => {
    const user = userEvent.setup()
    renderPanel({ proposals: [makeProposal({ status: 'proposed' })] })
    await user.click(screen.getByTestId('mic-btn'))
    expect(screen.getByTestId('recording-bar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('closes immediately when closing while recording and no pending proposals', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ proposals: [], onClose })
    await user.click(screen.getByTestId('mic-btn'))
    expect(screen.getByTestId('recording-bar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    renderPanel({ open: false })
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('input value is cleared when panel closes and reopens', async () => {
    const user = userEvent.setup()
    const props = { ...defaultProps }
    const { rerender } = render(<AtelierAssistantPanel {...props} />)

    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'some text')
    expect((input as HTMLInputElement).value).toBe('some text')

    // Close panel
    rerender(<AtelierAssistantPanel {...props} open={false} />)
    // Reopen panel
    rerender(<AtelierAssistantPanel {...props} open={true} />)

    expect((screen.getByTestId('assistant-input') as HTMLInputElement).value).toBe('')
  })

  it('permission-denied mic error is cleared on close so reopen shows idle input', async () => {
    const user = userEvent.setup()
    mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    const props = { ...defaultProps }
    const { rerender } = render(<AtelierAssistantPanel {...props} />)

    // Trigger permission denied
    await user.click(screen.getByTestId('mic-btn'))
    await waitFor(() => expect(screen.getByTestId('mic-permission-error')).toBeInTheDocument())

    // Close and reopen
    rerender(<AtelierAssistantPanel {...props} open={false} />)
    rerender(<AtelierAssistantPanel {...props} open={true} />)

    // Must show idle empty state, not permission error
    expect(screen.queryByTestId('mic-permission-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('assistant-input')).toBeInTheDocument()
  })

  it('upload-failed mic error is cleared on close so reopen shows idle input', async () => {
    vi.useFakeTimers()
    mockUpload.mockRejectedValue(new Error('network'))
    const props = { ...defaultProps }
    const { rerender } = render(<AtelierAssistantPanel {...props} />)

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    expect(await screen.findByTestId('upload-error')).toBeInTheDocument()

    // Close and reopen
    rerender(<AtelierAssistantPanel {...props} open={false} />)
    rerender(<AtelierAssistantPanel {...props} open={true} />)

    // Must show idle input row, not error state
    expect(screen.queryByTestId('upload-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('assistant-input')).toBeInTheDocument()
  })

  // ---- voice input tests ------------------------------------------------------

  it('renders mic button in idle state', () => {
    renderPanel()
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
  })

  it('clicking mic starts recording: shows waveform, timer, stop and cancel buttons', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByTestId('mic-btn'))
    expect(screen.getByTestId('recording-bar')).toBeInTheDocument()
    expect(screen.getByTestId('waveform')).toBeInTheDocument()
    expect(screen.getByTestId('recording-timer')).toBeInTheDocument()
    expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument()
    expect(screen.getByTestId('cancel-recording-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('assistant-input')).not.toBeInTheDocument()
  })

  it('stop recording after 2s uploads audio and calls onSubmit with transcription', async () => {
    vi.useFakeTimers()
    const onSubmit = vi.fn()
    renderPanel({ onSubmit })

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    expect(mockUpload).toHaveBeenCalled()
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Past perfect with Ana.')
    })
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
  })

  it('cancel recording does not upload or call onSubmit, returns to idle', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderPanel({ onSubmit })

    await user.click(screen.getByTestId('mic-btn'))
    expect(screen.getByTestId('recording-bar')).toBeInTheDocument()

    await user.click(screen.getByTestId('cancel-recording-btn'))
    expect(mockUpload).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
  })

  it('very short recording (<1s) shows hint and does not upload', async () => {
    vi.useFakeTimers()
    const onSubmit = vi.fn()
    renderPanel({ onSubmit })

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    expect(mockUpload).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('too-short-hint')).toBeInTheDocument()
  })

  it('permission denied shows in-panel error with retry button', async () => {
    mockGetUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByTestId('mic-btn'))
    expect(await screen.findByTestId('mic-permission-error')).toBeInTheDocument()
    expect(screen.getByTestId('mic-retry-btn')).toBeInTheDocument()
  })

  it('retry after permission error clears error and shows idle input bar', async () => {
    mockGetUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByTestId('mic-btn'))
    await screen.findByTestId('mic-permission-error')
    await user.click(screen.getByTestId('mic-retry-btn'))
    expect(screen.queryByTestId('mic-permission-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
  })

  it('empty transcription shows friendly hint and does not call onSubmit', async () => {
    vi.useFakeTimers()
    const onSubmit = vi.fn()
    mockUpload.mockResolvedValue({ ...SAMPLE_NOTE, transcription: '' })
    renderPanel({ onSubmit })

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    expect(await screen.findByTestId('empty-transcription-hint')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('upload error shows retry affordance', async () => {
    vi.useFakeTimers()
    mockUpload.mockRejectedValue(new Error('network'))
    renderPanel()

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    expect(await screen.findByTestId('upload-error')).toBeInTheDocument()
    expect(screen.getByTestId('upload-retry-btn')).toBeInTheDocument()
  })

  it('upload error retry resets to idle', async () => {
    vi.useFakeTimers()
    mockUpload.mockRejectedValue(new Error('network'))
    renderPanel()

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    vi.useRealTimers()

    await screen.findByTestId('upload-retry-btn')
    const user = userEvent.setup()
    await user.click(screen.getByTestId('upload-retry-btn'))
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('upload-error')).not.toBeInTheDocument()
  })

  it('slow STT (>15s) shows Cancel button that resets to idle', async () => {
    vi.useFakeTimers()
    mockUpload.mockReturnValue(new Promise(() => {}))
    renderPanel()

    await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
    expect(screen.getByTestId('transcribing-state')).toBeInTheDocument()
    expect(screen.queryByTestId('cancel-transcription-btn')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(15000) })
    vi.useRealTimers()

    expect(await screen.findByTestId('cancel-transcription-btn')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByTestId('cancel-transcription-btn'))
    expect(screen.getByTestId('mic-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('transcribing-state')).not.toBeInTheDocument()
  })

  it('closing panel during recording cancels without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    renderPanel({ onSubmit, onClose })

    await user.click(screen.getByTestId('mic-btn'))
    expect(screen.getByTestId('recording-bar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close assistant/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Voice feedback (thumbs up / down)
  // ---------------------------------------------------------------------------

  describe('voice feedback', () => {
    let mockSubmitFeedback: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      // Grab the (already hoisted) mock and reset it
      const mod = await import('@/api/assistant')
      mockSubmitFeedback = mod.submitVoiceFeedback as ReturnType<typeof vi.fn>
      mockSubmitFeedback.mockReset()
      mockSubmitFeedback.mockResolvedValue(undefined)
    })

    async function renderWithVoiceTurn(overrides: Partial<typeof defaultProps> = {}) {
      vi.useFakeTimers()
      renderPanel({
        transcription: 'Past perfect with Ana.',
        proposals: [makeProposal()],
        processing: false,
        ...overrides,
      })
      // Go through a full recording+upload cycle so currentVoiceNoteId is set.
      // useMicRecorder has a minDurationSeconds=1 guard so we must advance by >1s.
      await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
      act(() => { vi.advanceTimersByTime(2000) })
      await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
      vi.useRealTimers()
      await waitFor(() => expect(screen.getByTestId('thumbs-pair')).toBeInTheDocument())
      // Create a new user after restoring real timers (the fake-timer user would error on click)
      const user = userEvent.setup()
      return { user }
    }

    it('thumbs pair renders when voice-originated with proposals and not processing', async () => {
      await renderWithVoiceTurn()
      expect(screen.getByTestId('thumbs-pair')).toBeInTheDocument()
    })

    it('thumbs pair does NOT render for text-only turns (no voiceNoteId)', () => {
      renderPanel({
        transcription: 'Some text',
        proposals: [makeProposal()],
        processing: false,
      })
      expect(screen.queryByTestId('thumbs-pair')).not.toBeInTheDocument()
    })

    it('thumbs pair does NOT render while processing', () => {
      renderPanel({
        transcription: 'Some text',
        proposals: [makeProposal()],
        processing: true,
      })
      expect(screen.queryByTestId('thumbs-pair')).not.toBeInTheDocument()
    })

    it('thumbs-up collapses to Thanks and fires submitVoiceFeedback', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-up-btn'))
      expect(await screen.findByTestId('feedback-thanks')).toBeInTheDocument()
      expect(screen.queryByTestId('thumbs-pair')).not.toBeInTheDocument()
      expect(mockSubmitFeedback).toHaveBeenCalledWith('note-1', 'up', undefined, undefined, undefined, expect.any(String))
    })

    it('thumbs-down opens chip with swapped placeholder', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-down-btn'))
      expect(screen.getByTestId('feedback-chip')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-input')).toHaveAttribute('placeholder', "What's wrong with these suggestions?")
    })

    it('thumbs-down send with reason fires submitVoiceFeedback and shows Reported', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-down-btn'))
      await user.type(screen.getByTestId('assistant-input'), 'wrong level')
      await user.click(screen.getByTestId('assistant-send-btn'))
      expect(mockSubmitFeedback).toHaveBeenCalledWith('note-1', 'down', 'wrong level', undefined, undefined, expect.any(String))
      expect(await screen.findByTestId('feedback-reported')).toBeInTheDocument()
      expect(screen.queryByTestId('feedback-chip')).not.toBeInTheDocument()
    })

    it('thumbs-down send without reason fires submitVoiceFeedback with undefined reason', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-down-btn'))
      await user.click(screen.getByTestId('assistant-send-btn'))
      expect(mockSubmitFeedback).toHaveBeenCalledWith('note-1', 'down', undefined, undefined, undefined, expect.any(String))
    })

    it('cancel chip (X) restores idle state without calling submitVoiceFeedback', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-down-btn'))
      await user.click(screen.getByTestId('feedback-chip-cancel'))
      expect(screen.queryByTestId('feedback-chip')).not.toBeInTheDocument()
      expect(screen.getByTestId('assistant-input')).toHaveAttribute('placeholder', 'What did you cover today?')
      expect(mockSubmitFeedback).not.toHaveBeenCalled()
    })

    it('Apply All and Dismiss All remain functional while thumbs-down chip is open', async () => {
      const onApplyAll = vi.fn()
      const onDismissAll = vi.fn()
      const { user } = await renderWithVoiceTurn({ onApplyAll, onDismissAll })
      await user.click(screen.getByTestId('thumbs-down-btn'))
      expect(screen.getByTestId('feedback-chip')).toBeInTheDocument()
      // Batch actions are still present and clickable
      await user.click(screen.getByTestId('apply-all-btn'))
      expect(onApplyAll).toHaveBeenCalled()
      await user.click(screen.getByTestId('dismiss-all-btn'))
      expect(onDismissAll).toHaveBeenCalled()
    })

    it('turn replacement: new voice upload resets thumbs to idle pair', async () => {
      const { user } = await renderWithVoiceTurn()
      await user.click(screen.getByTestId('thumbs-up-btn'))
      expect(await screen.findByTestId('feedback-thanks')).toBeInTheDocument()

      // Second voice upload -- thumbs should reset to a fresh idle pair
      vi.useFakeTimers()
      await act(async () => { fireEvent.click(screen.getByTestId('mic-btn')) })
      act(() => { vi.advanceTimersByTime(2000) })
      await act(async () => { fireEvent.click(screen.getByTestId('stop-recording-btn')) })
      vi.useRealTimers()
      await waitFor(() => expect(screen.getByTestId('thumbs-pair')).toBeInTheDocument())
      expect(screen.queryByTestId('feedback-thanks')).not.toBeInTheDocument()
    })
  })
})
