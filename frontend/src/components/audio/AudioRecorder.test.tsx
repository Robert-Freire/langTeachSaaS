import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioRecorder } from './AudioRecorder'
import * as voiceNotesApi from '../../api/voiceNotes'
import type { VoiceNote } from '../../api/voiceNotes'

vi.mock('../../api/voiceNotes', () => ({
  uploadVoiceNote: vi.fn(),
}))

const SAMPLE_NOTE: VoiceNote = {
  id: 'note-1',
  originalFileName: 'recording.webm',
  contentType: 'audio/webm',
  sizeBytes: 1024,
  durationSeconds: 0,
  transcription: '[Test transcription]',
  transcribedAt: '2026-04-05T10:00:05Z',
  createdAt: '2026-04-05T10:00:00Z',
}

// Mock MediaDevices
const mockGetUserMedia = vi.fn()
Object.defineProperty(window.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
})

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  mimeType = 'audio/webm'
  state = 'inactive'
  start = vi.fn().mockImplementation(() => { this.state = 'recording' })
  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  })
}
vi.stubGlobal('MediaRecorder', MockMediaRecorder)

describe('AudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(voiceNotesApi.uploadVoiceNote).mockResolvedValue(SAMPLE_NOTE)
  })

  it('renders record and upload buttons in idle state', () => {
    render(<AudioRecorder onVoiceNote={vi.fn()} />)
    expect(screen.getByTestId('record-button')).toBeInTheDocument()
    expect(screen.getByTestId('upload-audio-button')).toBeInTheDocument()
  })

  it('transitions to recording state when record is clicked', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    render(<AudioRecorder onVoiceNote={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('record-button'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('stop-button')).toBeInTheDocument()
    })
  })

  it('uploads and calls onVoiceNote after stopping recording', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)
    const onVoiceNote = vi.fn()

    render(<AudioRecorder onVoiceNote={onVoiceNote} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('record-button'))
    })

    await waitFor(() => screen.getByTestId('stop-button'))

    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-button'))
    })

    await waitFor(() => {
      expect(onVoiceNote).toHaveBeenCalledWith(SAMPLE_NOTE)
    })
  })

  it('shows done state after successful upload', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    render(<AudioRecorder onVoiceNote={vi.fn()} />)

    await act(async () => fireEvent.click(screen.getByTestId('record-button')))
    await waitFor(() => screen.getByTestId('stop-button'))
    await act(async () => fireEvent.click(screen.getByTestId('stop-button')))

    await waitFor(() => {
      expect(screen.getByTestId('record-again-button')).toBeInTheDocument()
    })
  })

  it('shows error when microphone access is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

    render(<AudioRecorder onVoiceNote={vi.fn()} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('record-button'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Microphone access denied')
    })
  })

  it('shows error for unsupported upload file type', async () => {
    render(<AudioRecorder onVoiceNote={vi.fn()} />)

    const input = screen.getByTestId('audio-file-input')
    const file = new File(['data'], 'video.mp4', { type: 'video/mp4' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Unsupported file type')
    })
  })

  it('disables buttons when disabled prop is true', () => {
    render(<AudioRecorder onVoiceNote={vi.fn()} disabled />)
    expect(screen.getByTestId('record-button')).toBeDisabled()
    expect(screen.getByTestId('upload-audio-button')).toBeDisabled()
  })
})
