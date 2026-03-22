import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { Lesson, LessonListResponse } from '../api/lessons'

const mockGetLessons = vi.fn()
const mockGetStudents = vi.fn()
const mockGetCourses = vi.fn()

vi.mock('../api/lessons', () => ({
  getLessons: (...args: unknown[]) => mockGetLessons(...args),
}))

vi.mock('../api/students', () => ({
  getStudents: (...args: unknown[]) => mockGetStudents(...args),
}))

vi.mock('../api/courses', () => ({
  getCourses: (...args: unknown[]) => mockGetCourses(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeLessonResponse(items: Partial<Lesson>[]): LessonListResponse {
  return {
    items: items.map((l, i) => ({
      id: l.id ?? `lesson-${i}`,
      title: l.title ?? `Lesson ${i}`,
      language: l.language ?? 'English',
      cefrLevel: l.cefrLevel ?? 'B1',
      topic: l.topic ?? 'Test',
      durationMinutes: l.durationMinutes ?? 60,
      objectives: l.objectives ?? null,
      status: l.status ?? 'Draft',
      studentId: l.studentId ?? null,
      templateId: l.templateId ?? null,
      sections: l.sections ?? [],
      createdAt: l.createdAt ?? '2026-03-10T10:00:00Z',
      updatedAt: l.updatedAt ?? '2026-03-10T10:00:00Z',
      scheduledAt: l.scheduledAt ?? null,
      studentName: l.studentName ?? null,
    })),
    totalCount: items.length,
    page: 1,
    pageSize: 100,
  }
}

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudents.mockResolvedValue({
      items: [
        { id: 's1', name: 'Alice', learningLanguage: 'English', cefrLevel: 'B1', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], createdAt: '', updatedAt: '' },
      ],
      totalCount: 1,
    })
    mockGetLessons.mockResolvedValue(makeLessonResponse([]))
    mockGetCourses.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders week strip with 7 day columns', async () => {
    renderDashboard()
    for (let i = 0; i < 7; i++) {
      expect(await screen.findByTestId(`week-day-${i}`)).toBeInTheDocument()
    }
  })

  it('shows scheduled lessons as pills in day columns', async () => {
    // Get today's day index to know which column the lesson should appear in
    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10) + 'T10:00:00'

    mockGetLessons.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.scheduledFrom) {
        return Promise.resolve(makeLessonResponse([
          { id: 'sched-1', scheduledAt: todayISO, studentName: 'Alice', status: 'Published' },
        ]))
      }
      return Promise.resolve(makeLessonResponse([]))
    })

    renderDashboard()
    const pill = await screen.findByTestId('lesson-pill-sched-1')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent('Alice')
  })

  it('shows draft lessons in needs preparation section', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().slice(0, 10) + 'T10:00:00'

    mockGetLessons.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.status === 'Draft') {
        return Promise.resolve(makeLessonResponse([
          { id: 'draft-1', scheduledAt: tomorrowISO, status: 'Draft', studentName: 'Bob', topic: 'Grammar' },
        ]))
      }
      return Promise.resolve(makeLessonResponse([]))
    })

    renderDashboard()
    const prepItem = await screen.findByTestId('needs-prep-draft-1')
    expect(prepItem).toBeInTheDocument()
  })

  it('shows unscheduled drafts in collapsible section', async () => {
    const draftResponse = makeLessonResponse([
      { id: 'unsched-1', scheduledAt: null, status: 'Draft' as const, title: 'Unscheduled Lesson' },
    ])
    mockGetLessons.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.status === 'Draft') return Promise.resolve(draftResponse)
      return Promise.resolve(makeLessonResponse([]))
    })

    await act(async () => {
      renderDashboard()
    })
    // First wait for week strip to confirm render cycle completed
    await screen.findByTestId('week-strip')
    // Now check for unscheduled section
    await waitFor(() => {
      expect(screen.getByTestId('unscheduled-drafts')).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.getByTestId('unscheduled-unsched-1')).toBeInTheDocument()
  })

  it('shows published unscheduled lessons in unscheduled section', async () => {
    const publishedResponse = makeLessonResponse([
      { id: 'pub-1', scheduledAt: null, status: 'Published' as const, title: 'Ready Lesson' },
    ])
    mockGetLessons.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.status === 'Published') return Promise.resolve(publishedResponse)
      return Promise.resolve(makeLessonResponse([]))
    })

    await act(async () => {
      renderDashboard()
    })
    await screen.findByTestId('week-strip')
    await waitFor(() => {
      expect(screen.getByTestId('unscheduled-drafts')).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.getByTestId('unscheduled-pub-1')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('navigates to lesson editor when clicking a pill', async () => {
    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10) + 'T10:00:00'

    mockGetLessons.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.scheduledFrom) {
        return Promise.resolve(makeLessonResponse([
          { id: 'nav-1', scheduledAt: todayISO, studentName: 'Alice' },
        ]))
      }
      return Promise.resolve(makeLessonResponse([]))
    })

    renderDashboard()
    const pill = await screen.findByTestId('lesson-pill-nav-1')
    await userEvent.click(pill)
    expect(mockNavigate).toHaveBeenCalledWith('/lessons/nav-1')
  })

  it('renders schedule popover trigger in day columns', async () => {
    renderDashboard()
    await screen.findByTestId('week-strip')
    const triggers = await screen.findAllByTestId('schedule-popover-trigger')
    expect(triggers).toHaveLength(7)
  })

  it('shifts week on navigation button click', async () => {
    renderDashboard()
    const nextBtn = await screen.findByTestId('week-next')
    await userEvent.click(nextBtn)
    // The getLessons should have been called again with new date range
    expect(mockGetLessons).toHaveBeenCalled()
  })

  describe('loading states', () => {
    it('shows skeleton while API requests are in-flight', () => {
      mockGetStudents.mockReturnValue(new Promise(() => {}))
      mockGetLessons.mockReturnValue(new Promise(() => {}))
      mockGetCourses.mockReturnValue(new Promise(() => {}))

      renderDashboard()
      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('shows actual content after API responds (not skeleton)', async () => {
      renderDashboard()
      await screen.findByText('Dashboard')
      expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument()
    })

    it('shows empty state (not skeleton) when API returns zero results', async () => {
      mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
      mockGetLessons.mockResolvedValue(makeLessonResponse([]))
      mockGetCourses.mockResolvedValue([])

      renderDashboard()
      await screen.findByText('Dashboard')
      expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument()
      expect(screen.getByText('Your teaching command center.')).toBeInTheDocument()
    })

    it('does not show slow-connection message before 5 seconds', () => {
      vi.useFakeTimers()
      mockGetStudents.mockReturnValue(new Promise(() => {}))
      mockGetLessons.mockReturnValue(new Promise(() => {}))
      mockGetCourses.mockReturnValue(new Promise(() => {}))

      renderDashboard()
      act(() => { vi.advanceTimersByTime(4999) })
      expect(screen.queryByTestId('slow-connection-message')).not.toBeInTheDocument()
    })

    it('shows slow-connection message after 5 seconds of loading', () => {
      vi.useFakeTimers()
      mockGetStudents.mockReturnValue(new Promise(() => {}))
      mockGetLessons.mockReturnValue(new Promise(() => {}))
      mockGetCourses.mockReturnValue(new Promise(() => {}))

      renderDashboard()
      act(() => { vi.advanceTimersByTime(5000) })
      expect(screen.getByTestId('slow-connection-message')).toBeInTheDocument()
      expect(screen.getByText(/Still connecting/)).toBeInTheDocument()
    })
  })

  it('shows empty state with create lesson CTA when teacher has no lessons', async () => {
    mockGetLessons.mockResolvedValue(makeLessonResponse([]))
    renderDashboard()
    expect(await screen.findByTestId('dashboard-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/No lessons yet/)).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-empty-new-lesson')).toBeInTheDocument()
  })

  it('does not show empty state when teacher has lessons', async () => {
    mockGetLessons.mockResolvedValue(makeLessonResponse([{ id: 'l1', title: 'Lesson 1' }]))
    renderDashboard()
    // Wait for data to load
    await screen.findByTestId('quick-actions')
    expect(screen.queryByTestId('dashboard-empty-state')).not.toBeInTheDocument()
  })
})
