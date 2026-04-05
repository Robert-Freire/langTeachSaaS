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
        emotionalSignals: null,
        followingSessionHomeworkStatus: null,
        followingSessionHomeworkStatusName: null,
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
        emotionalSignals: null,
        followingSessionHomeworkStatus: null,
        followingSessionHomeworkStatusName: null,
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

  const baseEntry = {
    lessonId: 'lesson-1',
    title: 'Vocab Lesson',
    templateName: null,
    lessonDate: '2026-03-15T10:00:00Z',
    whatWasCovered: null,
    homeworkAssigned: 'Read chapter 2',
    areasToImprove: null,
    nextLessonIdeas: null,
    emotionalSignals: null,
    followingSessionHomeworkStatus: null,
    followingSessionHomeworkStatusName: null,
  }

  it('shows green badge when homework was Done', async () => {
    mockGetLessonHistory.mockResolvedValue([
      { ...baseEntry, followingSessionHomeworkStatus: 3, followingSessionHomeworkStatusName: 'Done' },
    ])
    renderCard('student-1')

    const badge = await screen.findByTestId('lesson-history-hw-status-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Done')
    expect(badge.className).toContain('text-green-700')
  })

  it('shows amber badge when homework was Partial', async () => {
    mockGetLessonHistory.mockResolvedValue([
      { ...baseEntry, followingSessionHomeworkStatus: 2, followingSessionHomeworkStatusName: 'Partial' },
    ])
    renderCard('student-1')

    const badge = await screen.findByTestId('lesson-history-hw-status-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Partial')
    expect(badge.className).toContain('text-amber-700')
  })

  it('shows red badge when homework was NotDone', async () => {
    mockGetLessonHistory.mockResolvedValue([
      { ...baseEntry, followingSessionHomeworkStatus: 1, followingSessionHomeworkStatusName: 'NotDone' },
    ])
    renderCard('student-1')

    const badge = await screen.findByTestId('lesson-history-hw-status-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Not done')
    expect(badge.className).toContain('text-red-700')
  })

  it('shows no badge when status is NotApplicable', async () => {
    mockGetLessonHistory.mockResolvedValue([
      { ...baseEntry, followingSessionHomeworkStatus: 0, followingSessionHomeworkStatusName: 'NotApplicable' },
    ])
    renderCard('student-1')

    await screen.findByTestId('lesson-history-homeworkAssigned')
    expect(screen.queryByTestId('lesson-history-hw-status-badge')).not.toBeInTheDocument()
  })

  it('shows no badge when followingSessionHomeworkStatusName is null', async () => {
    mockGetLessonHistory.mockResolvedValue([
      { ...baseEntry, followingSessionHomeworkStatus: null, followingSessionHomeworkStatusName: null },
    ])
    renderCard('student-1')

    await screen.findByTestId('lesson-history-homeworkAssigned')
    expect(screen.queryByTestId('lesson-history-hw-status-badge')).not.toBeInTheDocument()
  })
})
