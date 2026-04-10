import { render, screen, within, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { DashboardData } from '@/api/dashboard'

const mockGetDashboard = vi.fn()

vi.mock('@/api/dashboard', () => ({
  getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
}))

function makeEmptyDashboard(): DashboardData {
  return { nextSession: null, todaySessions: [], activeStudents: [] }
}

function makeDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    nextSession: {
      sessionLogId: 'sl1',
      studentId: 'student-1',
      studentName: 'Ana García',
      studentCefrLevel: 'B1',
      sessionDate: new Date(Date.now() + 3600000).toISOString(),
      plannedContent: 'Subjunctive',
      lastSessionNotes: 'Good progress',
      lastSessionDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      homeworkAssigned: 'Page 42',
      previousHomeworkStatus: '3',
    },
    todaySessions: [
      {
        sessionLogId: 'sl1',
        studentId: 'student-1',
        studentName: 'Ana García',
        studentCefrLevel: 'B1',
        sessionDate: new Date().toISOString(),
        plannedContent: 'Subjunctive',
        status: 'Confirmed',
      },
    ],
    activeStudents: [
      {
        studentId: 'student-1',
        name: 'Ana García',
        cefrLevel: 'B1',
        nativeLanguages: ['English'],
        isActive: true,
        lastSessionDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        nextSessionDate: new Date(Date.now() + 3600000).toISOString(),
        totalSessions: 5,
        teachingTodosCount: 1,
        pendingTodos: [
          { id: 't1', text: 'Review ser/estar', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null },
        ],
      },
    ],
    ...overrides,
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
    mockGetDashboard.mockResolvedValue(makeEmptyDashboard())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows skeleton while loading', () => {
    mockGetDashboard.mockReturnValue(new Promise(() => {}))
    renderDashboard()
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('shows h1 Dashboard after load', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows slow connection message after 5 seconds', () => {
    vi.useFakeTimers()
    mockGetDashboard.mockReturnValue(new Promise(() => {}))
    renderDashboard()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByTestId('slow-connection-message')).toBeInTheDocument()
  })

  it('does not show slow message before 5 seconds', () => {
    vi.useFakeTimers()
    mockGetDashboard.mockReturnValue(new Promise(() => {}))
    renderDashboard()
    act(() => { vi.advanceTimersByTime(4999) })
    expect(screen.queryByTestId('slow-connection-message')).not.toBeInTheDocument()
  })

  describe('Zone 1: Next Session Hero', () => {
    it('shows empty state when no next session', async () => {
      renderDashboard()
      expect(await screen.findByTestId('zone1-empty')).toBeInTheDocument()
    })

    it('shows hero with student name when session exists', async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard())
      renderDashboard()
      const hero = await screen.findByTestId('zone1-next-session')
      expect(hero).toBeInTheDocument()
      expect(within(hero).getByText('Ana García')).toBeInTheDocument()
    })
  })

  describe('Zone 2: Today Agenda', () => {
    it('shows empty state when no today sessions', async () => {
      renderDashboard()
      expect(await screen.findByText(/No sessions today/)).toBeInTheDocument()
    })

    it('shows session rows when sessions exist', async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard())
      renderDashboard()
      expect(await screen.findByTestId('zone2-today-agenda')).toBeInTheDocument()
    })
  })

  describe('Zone 2: Pending Followups', () => {
    it('shows all caught up when no pending todos', async () => {
      renderDashboard()
      expect(await screen.findByText(/All caught up/)).toBeInTheDocument()
    })

    it('shows pending todo text when todos exist', async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard())
      renderDashboard()
      expect(await screen.findByText('Review ser/estar')).toBeInTheDocument()
    })
  })

  describe('Zone 3: Student Roster', () => {
    it('renders zone3-student-roster', async () => {
      renderDashboard()
      expect(await screen.findByTestId('zone3-student-roster')).toBeInTheDocument()
    })

    it('shows student rows with link to detail', async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard())
      renderDashboard()
      const link = await screen.findByRole('link', { name: 'Ana García' })
      expect(link).toHaveAttribute('href', '/students/student-1')
    })

    it('shows VIEW ENTIRE STUDENT BASE link when students exist', async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard())
      renderDashboard()
      expect(await screen.findByRole('link', { name: /View entire student base/i })).toHaveAttribute('href', '/students')
    })
  })
})
