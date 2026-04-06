import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProgressDashboard } from './ProgressDashboard'
import type { StudentProgress } from '@/api/progress'

const mockGetProgress = vi.fn()

vi.mock('../../api/progress', () => ({
  getProgress: (...args: unknown[]) => mockGetProgress(...args),
}))

function renderDashboard(studentId = 'student-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ProgressDashboard studentId={studentId} />
    </QueryClientProvider>,
  )
}

const baseProgress: StudentProgress = {
  studentName: 'Diego Seed',
  courseName: 'B2 English Course',
  courseId: 'course-1',
  totalEntries: 4,
  taughtEntries: 1,
  createdEntries: 1,
  plannedEntries: 2,
  plannedSessionCount: 8,
  sessionsDone: 2,
  examDate: null,
  pacingStatus: 'on-track',
  daysUntilExam: null,
  sessionsRemaining: 6,
  difficulties: [],
  timeline: [
    { orderIndex: 1, topic: 'Conditionals', grammarFocus: 'If clauses', status: 'taught', sessionDate: '2026-03-23T10:00:00Z' },
    { orderIndex: 2, topic: 'Past Tense', grammarFocus: null, status: 'created', sessionDate: null },
    { orderIndex: 3, topic: 'Future Plans', grammarFocus: null, status: 'planned', sessionDate: null },
  ],
}

describe('ProgressDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders coverage bar with correct percentage', async () => {
    mockGetProgress.mockResolvedValue(baseProgress)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByTestId('coverage-bar')).toBeInTheDocument()
    })
    expect(screen.getByText('25%')).toBeInTheDocument() // 1 of 4 = 25%
  })

  it('shows no-course empty state when courseId is null', async () => {
    mockGetProgress.mockResolvedValue({ ...baseProgress, courseId: null, courseName: null })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByTestId('progress-no-course')).toBeInTheDocument()
    })
  })

  it('renders pacing chip for each status', async () => {
    for (const status of ['on-track', 'ahead', 'behind', 'unknown'] as const) {
      vi.clearAllMocks()
      mockGetProgress.mockResolvedValue({ ...baseProgress, pacingStatus: status })
      const { unmount } = renderDashboard()
      await waitFor(() => {
        expect(screen.getByTestId('pacing-status')).toBeInTheDocument()
      })
      unmount()
    }
  })

  it('renders timeline entries in order', async () => {
    mockGetProgress.mockResolvedValue(baseProgress)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByTestId('progress-timeline')).toBeInTheDocument()
    })
    const items = screen.getByTestId('progress-timeline').querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toContain('Conditionals')
    expect(items[1].textContent).toContain('Past Tense')
    expect(items[2].textContent).toContain('Future Plans')
  })

  it('shows difficulty trends when present', async () => {
    mockGetProgress.mockResolvedValue({
      ...baseProgress,
      difficulties: [
        { id: 'd1', description: 'Articles', competency: 'Grammar', subcategory: 'Articles', severity: 'medium', status: 'Active', trend: 'worsening' },
        { id: 'd2', description: 'Listening', competency: 'Skills', subcategory: 'Listening', severity: 'low', status: 'Covered', trend: 'improving' },
      ],
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-trends')).toBeInTheDocument()
    })
    expect(screen.getByText('Articles')).toBeInTheDocument()
    expect(screen.getByText('Listening')).toBeInTheDocument()
  })

  it('shows sessions done and remaining', async () => {
    mockGetProgress.mockResolvedValue(baseProgress)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/2 sessions done of 8 planned/)).toBeInTheDocument()
    })
  })
})
