import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import AtelierAssistantPanel from './AtelierAssistantPanel'
import type { VoiceNote } from '@/api/voiceNotes'

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

  // ---- existing text-input tests -----------------------------------------

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

  it('shows transcription block and proposals stub', () => {
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

  it('calls onCloseDiscarding when Discard pressed', async () => {
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
    await user.click(screen.getByTestId('discard-confirm-cancel'))
    expect(screen.queryByTestId('discard-confirm')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    renderPanel({ open: false })
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  // ---- voice input tests --------------------------------------------------

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
    // elapsed stays 0 — stop immediately without advancing timers
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

  it('slow STT (>15s) shows Cancel button that resets to idle', async () => {
    vi.useFakeTimers()
    // Make upload hang indefinitely
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
})
