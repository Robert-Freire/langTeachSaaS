import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LessonHistoryCard } from './LessonHistoryCard'

const mockGetLessonHistory = vi.fn()

vi.mock('../../api/students', () => ({
  getLessonHistory: (...args: unknown[]) => mockGetLessonHistory(...args),
}))

function renderCard(studentId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LessonHistoryCard studentId={studentId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LessonHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no entries', async () => {
    mockGetLessonHistory.mockResolvedValue([])
    renderCard('student-1')

    await waitFor(() => {
      expect(screen.getByTestId('lesson-history-empty')).toBeInTheDocument()
    })
    expect(screen.getByText('No lesson notes yet.')).toBeInTheDocument()
  })

  it('renders entries with titles and dates', async () => {
    mockGetLessonHistory.mockResolvedValue([
      {
        lessonId: 'lesson-1',
        title: 'Past Tense Lesson',
        templateName: 'Grammar',
        lessonDate: '2026-03-15T10:00:00Z',
        whatWasCovered: 'Irregular verbs',
        homeworkAssigned: null,
        areasToImprove: 'Pronunciation',
        nextLessonIdeas: null,
      },
      {
        lessonId: 'lesson-2',
        title: 'Vocabulary Basics',
        templateName: null,
        lessonDate: '2026-03-10T09:00:00Z',
        whatWasCovered: 'Colors and numbers',
        homeworkAssigned: 'Worksheet 3',
        areasToImprove: null,
        nextLessonIdeas: null,
      },
    ])
    renderCard('student-1')

    const titles = await screen.findAllByTestId('lesson-history-title')
    expect(titles).toHaveLength(2)
    expect(titles[0]).toHaveTextContent('Past Tense Lesson')
    expect(titles[1]).toHaveTextContent('Vocabulary Basics')

    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText(/Irregular verbs/)).toBeInTheDocument()
    expect(screen.getByText(/Pronunciation/)).toBeInTheDocument()
    expect(screen.getByText(/Colors and numbers/)).toBeInTheDocument()
    expect(screen.getByText(/Worksheet 3/)).toBeInTheDocument()
  })
})
