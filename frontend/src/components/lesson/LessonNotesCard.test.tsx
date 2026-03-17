import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LessonNotesCard } from './LessonNotesCard'

const mockGetLessonNotes = vi.fn()
const mockSaveLessonNotes = vi.fn()

vi.mock('../../api/lessons', () => ({
  getLessonNotes: (...args: unknown[]) => mockGetLessonNotes(...args),
  saveLessonNotes: (...args: unknown[]) => mockSaveLessonNotes(...args),
}))

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
    mockSaveLessonNotes.mockResolvedValue({
      id: 'note-1',
      lessonId: 'lesson-1',
      whatWasCovered: 'Test',
      homeworkAssigned: null,
      areasToImprove: null,
      nextLessonIdeas: null,
    })
  })

  it('renders nothing when studentId is null', () => {
    renderCard({ lessonId: 'lesson-1', studentId: null })
    expect(screen.queryByTestId('lesson-notes-card')).not.toBeInTheDocument()
  })

  it('renders four textareas when studentId is present', async () => {
    renderCard({ lessonId: 'lesson-1', studentId: 'student-1' })

    await waitFor(() => {
      expect(screen.getByTestId('notes-whatWasCovered')).toBeInTheDocument()
    })
    expect(screen.getByTestId('notes-homeworkAssigned')).toBeInTheDocument()
    expect(screen.getByTestId('notes-areasToImprove')).toBeInTheDocument()
    expect(screen.getByTestId('notes-nextLessonIdeas')).toBeInTheDocument()
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
})
