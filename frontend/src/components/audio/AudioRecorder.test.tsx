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

  it('auto-starts recording on mount when autoStart is true', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    render(<AudioRecorder onVoiceNote={vi.fn()} autoStart />)

    await waitFor(() => {
      expect(screen.getByTestId('stop-button')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('upload-audio-button')).not.toBeInTheDocument()
  })

  it('shows a starting indicator while autoStart is awaiting mic permission', async () => {
    // getUserMedia stays pending: mimics the user not having decided on the
    // OS-level permission prompt yet. Without the starting indicator the
    // panel renders empty and the teacher thinks the feature is broken.
    mockGetUserMedia.mockReturnValue(new Promise(() => {}))

    render(<AudioRecorder onVoiceNote={vi.fn()} autoStart />)

    expect(await screen.findByTestId('recorder-starting')).toBeInTheDocument()
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('upload-audio-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stop-button')).not.toBeInTheDocument()
  })

  it('still starts recording when the parent rerenders with a new onVoiceNote reference', async () => {
    // Regression: an unstable onVoiceNote from the parent (no useCallback)
    // used to cascade into a new startRecording identity, retrigger the
    // autoStart effect, clearTimeout the pending startRecording call, and
    // leave autoStartedRef true so it never restarted. Result: spinner
    // forever, no stop button. This test renders the parent twice in quick
    // succession (mimicking a React re-render) and asserts recording starts.
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { rerender } = render(
      <AudioRecorder onVoiceNote={() => {}} autoStart />
    )
    // Force a parent rerender BEFORE the queued setTimeout(0) startRecording
    // fires. A new inline arrow function gives the prop a new identity.
    rerender(<AudioRecorder onVoiceNote={() => {}} autoStart />)

    await waitFor(() => {
      expect(screen.getByTestId('stop-button')).toBeInTheDocument()
    })
  })

  it('reveals the chooser when autoStart fails because mic permission is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

    render(<AudioRecorder onVoiceNote={vi.fn()} autoStart />)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Microphone access denied')
    })
    expect(screen.getByTestId('record-button')).toBeInTheDocument()
    expect(screen.getByTestId('upload-audio-button')).toBeInTheDocument()
  })

  it('shows the upload-fallback link during recording when showUploadFallbackLink is true', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    render(<AudioRecorder onVoiceNote={vi.fn()} autoStart showUploadFallbackLink />)

    expect(await screen.findByTestId('switch-to-upload-link')).toBeInTheDocument()
  })

  it('does not show the upload-fallback link when showUploadFallbackLink is omitted', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)

    render(<AudioRecorder onVoiceNote={vi.fn()} autoStart />)

    await waitFor(() => screen.getByTestId('stop-button'))
    expect(screen.queryByTestId('switch-to-upload-link')).not.toBeInTheDocument()
  })

  it('clicking the upload-fallback link discards the in-flight recording without uploading and opens the file picker', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
    mockGetUserMedia.mockResolvedValue(mockStream)
    const onVoiceNote = vi.fn()

    render(<AudioRecorder onVoiceNote={onVoiceNote} autoStart showUploadFallbackLink />)

    await waitFor(() => screen.getByTestId('switch-to-upload-link'))

    const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click')

    await act(async () => {
      fireEvent.click(screen.getByTestId('switch-to-upload-link'))
    })

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(onVoiceNote).not.toHaveBeenCalled()
    expect(voiceNotesApi.uploadVoiceNote).not.toHaveBeenCalled()
  })

  it('does not trigger a second upload if handleFileChange fires twice in quick succession', async () => {
    let resolveUpload: (v: VoiceNote) => void
    vi.mocked(voiceNotesApi.uploadVoiceNote).mockReturnValue(
      new Promise((r) => { resolveUpload = r })
    )

    render(<AudioRecorder onVoiceNote={vi.fn()} />)

    const input = screen.getByTestId('audio-file-input')
    const file = new File(['data'], 'audio.webm', { type: 'audio/webm' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    // Second fire while upload is still in progress — uploadVoiceNote should only be called once
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    resolveUpload!(SAMPLE_NOTE)

    await waitFor(() => {
      expect(voiceNotesApi.uploadVoiceNote).toHaveBeenCalledTimes(1)
    })
  })
})
