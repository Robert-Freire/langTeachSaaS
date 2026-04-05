import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LessonNotesCard } from './LessonNotesCard'

const mockGetLessonNotes = vi.fn()
const mockSaveLessonNotes = vi.fn()
const mockExtractReflectionNotes = vi.fn()

vi.mock('../../api/lessons', () => ({
  getLessonNotes: (...args: unknown[]) => mockGetLessonNotes(...args),
  saveLessonNotes: (...args: unknown[]) => mockSaveLessonNotes(...args),
  extractReflectionNotes: (...args: unknown[]) => mockExtractReflectionNotes(...args),
}))

// AudioRecorder uses MediaRecorder which isn't available in jsdom - stub it
vi.mock('../audio/AudioRecorder', () => ({
  AudioRecorder: ({ onVoiceNote }: { onVoiceNote: (n: unknown) => void }) => (
    <button
      data-testid="stub-audio-recorder"
      onClick={() => onVoiceNote({
        id: 'vn-1',
        originalFileName: 'recording.webm',
        contentType: 'audio/webm',
        sizeBytes: 1000,
        durationSeconds: 10,
        transcription: 'We covered past tense and homework was assigned.',
        transcribedAt: '2026-04-05T10:00:00Z',
        createdAt: '2026-04-05T10:00:00Z',
      })}
    >
      Record
    </button>
  ),
}))

const defaultNoteResponse = {
  id: 'note-1',
  lessonId: 'lesson-1',
  whatWasCovered: null,
  homeworkAssigned: null,
  areasToImprove: null,
  nextLessonIdeas: null,
  emotionalSignals: null,
}

function renderCard(props: { lessonId: string; studentId: string | null }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <LessonNotesCard {...props} />
    </QueryClientProvider>,
  )
}

describe('LessonNotesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLessonNotes.mockResolvedValue(null)
    mockSaveLessonNotes.mockResolvedValue(defaultNoteResponse)
  })

  it('renders nothing when studentId is null', () => {
    renderCard({ lessonId: 'lesson-1', studentId: null })
    expect(screen.queryByTestId('lesson-notes-card')).not.toBeInTheDocument()
  })

  it('renders five textareas when studentId is present', async () => {
    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    await waitFor(() => {
      expect(screen.getByTestId('notes-whatWasCovered')).toBeInTheDocument()
    })
    expect(screen.getByTestId('notes-homeworkAssigned')).toBeInTheDocument()
    expect(screen.getByTestId('notes-areasToImprove')).toBeInTheDocument()
    expect(screen.getByTestId('notes-nextLessonIdeas')).toBeInTheDocument()
    expect(screen.getByTestId('notes-emotionalSignals')).toBeInTheDocument()
  })

  it('calls saveLessonNotes on blur', async () => {
    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    const textarea = await screen.findByTestId('notes-whatWasCovered')
    fireEvent.change(textarea, { target: { value: 'Past tense' } })
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(mockSaveLessonNotes).toHaveBeenCalledWith('lesson-1', expect.objectContaining({
        whatWasCovered: 'Past tense',
      }))
    })
  })

  it('shows voice input section', async () => {
    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    await waitFor(() => {
      expect(screen.getByTestId('voice-input-section')).toBeInTheDocument()
    })
    expect(screen.getByTestId('stub-audio-recorder')).toBeInTheDocument()
  })

  it('shows transcription and extract button after voice note recorded', async () => {
    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    const recordBtn = await screen.findByTestId('stub-audio-recorder')
    fireEvent.click(recordBtn)

    await waitFor(() => {
      expect(screen.getByTestId('voice-note-transcription')).toBeInTheDocument()
    })
    expect(screen.getByTestId('extract-notes-button')).toBeInTheDocument()
  })

  it('shows suggestions panel after extraction and applies all', async () => {
    mockExtractReflectionNotes.mockResolvedValue({
      whatWasCovered: 'Past tense verbs',
      areasToImprove: 'Irregular verbs',
      emotionalSignals: 'Student was engaged',
      homeworkAssigned: 'Exercises 1-5',
      nextLessonIdeas: 'Present perfect',
    })

    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    const recordBtn = await screen.findByTestId('stub-audio-recorder')
    fireEvent.click(recordBtn)

    const extractBtn = await screen.findByTestId('extract-notes-button')
    fireEvent.click(extractBtn)

    await waitFor(() => {
      expect(screen.getByTestId('suggestions-panel')).toBeInTheDocument()
    })

    const applyAllBtn = screen.getByTestId('suggestions-apply-all')
    fireEvent.click(applyAllBtn)

    await waitFor(() => {
      expect(mockSaveLessonNotes).toHaveBeenCalledWith('lesson-1', expect.objectContaining({
        whatWasCovered: 'Past tense verbs',
        emotionalSignals: 'Student was engaged',
      }))
    })
    expect(screen.queryByTestId('suggestions-panel')).not.toBeInTheDocument()
  })

  it('dismisses suggestions panel', async () => {
    mockExtractReflectionNotes.mockResolvedValue({
      whatWasCovered: 'Past tense verbs',
      areasToImprove: null,
      emotionalSignals: null,
      homeworkAssigned: null,
      nextLessonIdeas: null,
    })

    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })
    fireEvent.click(await screen.findByTestId('stub-audio-recorder'))
    fireEvent.click(await screen.findByTestId('extract-notes-button'))

    await waitFor(() => {
      expect(screen.getByTestId('suggestions-panel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('suggestions-dismiss'))
    expect(screen.queryByTestId('suggestions-panel')).not.toBeInTheDocument()
  })
})
