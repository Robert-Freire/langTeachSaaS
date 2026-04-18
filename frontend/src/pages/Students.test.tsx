import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Students from './Students'
import * as studentsApi from '../api/students'
import * as dashboardApi from '../api/dashboard'

vi.mock('../api/students', () => ({
  getStudents: vi.fn(),
  deleteStudent: vi.fn(),
}))

vi.mock('../api/dashboard', () => ({
  getDashboard: vi.fn(),
}))

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

const emptyDashboard = { nextSession: null, todaySessions: [], activeStudents: [], pendingFollowups: [], upcomingThisWeek: [] }

// Default createdAt is 30 days ago to avoid triggering the NEW signal badge
const DEFAULT_CREATED_AT = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

function makeStudent(overrides: Partial<studentsApi.Student> = {}): studentsApi.Student {
  return {
    id: 'abc-123',
    name: 'Ana García',
    learningLanguage: 'Spanish',
    cefrLevel: 'B2',
    interests: [],
    personalNotes: null,
    teachingNotes: null,
    nativeLanguages: [],
    learningGoals: [],
    weaknesses: [],
    difficulties: [],
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: '',
    birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null,
    countryOfResidence: null, cityOfResidence: null, reasonForStudying: null,
    officialCefrLevel: null, shortTermObjectives: [], isActive: true, isCorporate: false,
    rate: null, spokenLanguages: [], teachingTodos: [], skillLevelOverrides: {},
    ...overrides,
  }
}

function makeActiveStudent(overrides: Partial<dashboardApi.ActiveStudent> = {}): dashboardApi.ActiveStudent {
  return {
    studentId: 'abc-123',
    name: 'Ana García',
    cefrLevel: 'B2',
    nativeLanguages: [],
    isActive: true,
    lastSessionDate: null,
    nextSessionDate: null,
    totalSessions: 5,
    teachingTodosCount: 0,
    pendingTodos: [],
    cancelledSessionsLast30Days: 0,
    nearestObjectiveDeadline: null,
    lastHomeworkStatus: null,
    ...overrides,
  }
}

function makeListResponse(items: studentsApi.Student[]): studentsApi.StudentListResponse {
  return { items, totalCount: items.length, page: 1, pageSize: 100 }
}

function wrapper(ui: React.ReactElement, initialSearch = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/${initialSearch}`]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Students page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue(emptyDashboard)
  })

  it('shows loading skeleton while students are fetching', () => {
    vi.mocked(studentsApi.getStudents).mockReturnValue(new Promise(() => {}))
    wrapper(<Students />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message when student list fetch fails', async () => {
    vi.mocked(studentsApi.getStudents).mockRejectedValue(new Error('Network error'))
    wrapper(<Students />)
    await screen.findByText('Failed to load students. Please try again.')
  })

  it('does not render a delete button in the student list row (delete moved to edit page)', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse([makeStudent()]))
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.queryByTestId('delete-student')).not.toBeInTheDocument()
  })

  it('does not render an edit pencil in the student list row (edit accessed from detail view)', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse([makeStudent()]))
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.queryByTestId('edit-student')).not.toBeInTheDocument()
  })

  it('renders student list when fetch succeeds', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ interests: ['travel'] })])
    )
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('shows native language when set', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ nativeLanguages: ['Portuguese'] })])
    )
    wrapper(<Students />)
    await screen.findByTestId('native-language-chip')
    expect(screen.getByTestId('native-language-chip')).toHaveTextContent('Portuguese')
  })

  it('shows dash for native language when none set', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ nativeLanguages: [] })])
    )
    wrapper(<Students />)
    await screen.findByTestId('native-language-chip')
    expect(screen.getByTestId('native-language-chip')).toHaveTextContent('—')
  })

  it('renders empty state when no students', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse([]))
    wrapper(<Students />)
    await screen.findByTestId('empty-state')
    expect(screen.getByText('No students yet')).toBeInTheDocument()
  })

  it('CEFR badge uses square Stitch classes (not rounded-full)', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ cefrLevel: 'B2' })])
    )
    wrapper(<Students />)
    const badge = await screen.findByTestId('student-level')
    expect(badge).toHaveTextContent('B2')
    expect(badge.className).toContain('rounded-md')
    expect(badge.className).not.toContain('rounded-full')
  })

  it('renders SIGNALS, CEFR LEVEL and LANGUAGE column headers', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse([makeStudent()]))
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('SIGNALS')).toBeInTheDocument()
    expect(screen.getByText('CEFR LEVEL')).toBeInTheDocument()
    expect(screen.getByText('LANGUAGE')).toBeInTheDocument()
  })

  it('filters students by name when search query is entered', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'a', name: 'Ana García' }),
        makeStudent({ id: 'b', name: 'Bruno Almeida' }),
      ])
    )
    wrapper(<Students />)
    await screen.findByText('Ana García')

    const input = screen.getByPlaceholderText('Search students...')
    fireEvent.change(input, { target: { value: 'Bruno' } })

    expect(screen.queryByText('Ana García')).not.toBeInTheDocument()
    expect(screen.getByText('Bruno Almeida')).toBeInTheDocument()
  })

  it('filters students by CEFR level when filter button clicked', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'a', name: 'Ana García', cefrLevel: 'B2' }),
        makeStudent({ id: 'b', name: 'Bruno Almeida', cefrLevel: 'A1' }),
      ])
    )
    wrapper(<Students />)
    await screen.findByText('Ana García')

    fireEvent.click(screen.getByRole('button', { name: 'B2' }))

    expect(screen.queryByText('Bruno Almeida')).not.toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('shows "No students match" when search has no results', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ name: 'Ana García' })])
    )
    wrapper(<Students />)
    await screen.findByText('Ana García')

    const input = screen.getByPlaceholderText('Search students...')
    fireEvent.change(input, { target: { value: 'zzz' } })

    expect(screen.getByText('No students match your search.')).toBeInTheDocument()
  })

  it('renders Review pending signal when student has pending todos', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null,
      todaySessions: [],
      pendingFollowups: [],
      upcomingThisWeek: [],
      activeStudents: [
        makeActiveStudent({
          studentId: 'abc-123',
          teachingTodosCount: 3,
          pendingTodos: [{ id: 't1', text: 'Review grammar', createdAt: '', sourceSessionLogId: null, status: 'pending', coveredInSessionLogId: null }],
        }),
      ],
    })

    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Review pending')).toBeInTheDocument()
  })

  it('shows Former badge for inactive student even without dashboard data', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123', isActive: false })])
    )
    // dashboard has no entry for this student (inactive students excluded from dashboard)
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Former')).toBeInTheDocument()
  })

  it('renders initials avatar for each student', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ name: 'Ana García' })])
    )
    wrapper(<Students />)
    const avatar = await screen.findByTestId('student-avatar')
    expect(avatar).toHaveTextContent('AG')
  })

  it('sort by Next Session orders students by upcoming session date ascending', async () => {
    const soon = new Date(Date.now() + 1 * 86400000).toISOString()
    const later = new Date(Date.now() + 5 * 86400000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'b', name: 'Bruno' }),
        makeStudent({ id: 'a', name: 'Ana' }),
      ])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [
        makeActiveStudent({ studentId: 'b', name: 'Bruno', nextSessionDate: later }),
        makeActiveStudent({ studentId: 'a', name: 'Ana', nextSessionDate: soon }),
      ],
    })
    // Use URL param to set sort to nextSession (default is now lastSession)
    wrapper(<Students />, '?sort=nextSession')
    await screen.findByText('Ana')

    // Ana (sooner) should appear first
    const names = screen.getAllByTestId('student-name').map(el => el.textContent)
    expect(names[0]).toBe('Ana')
    expect(names[1]).toBe('Bruno')
  })

  it('sort by Last Session orders students by most recent session first', async () => {
    const recent = new Date(Date.now() - 2 * 86400000).toISOString()
    const older = new Date(Date.now() - 10 * 86400000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'b', name: 'Bruno' }),
        makeStudent({ id: 'a', name: 'Ana' }),
      ])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [
        makeActiveStudent({ studentId: 'b', name: 'Bruno', lastSessionDate: older }),
        makeActiveStudent({ studentId: 'a', name: 'Ana', lastSessionDate: recent }),
      ],
    })
    // lastSession is the default — but pass explicitly for clarity
    wrapper(<Students />, '?sort=lastSession')
    await screen.findByText('Ana')

    const names = screen.getAllByTestId('student-name').map(el => el.textContent)
    expect(names[0]).toBe('Ana')
    expect(names[1]).toBe('Bruno')
  })

  it('sort by Name orders students alphabetically', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'z', name: 'Zara Smith' }),
        makeStudent({ id: 'a', name: 'Ana García' }),
      ])
    )
    wrapper(<Students />, '?sort=name')
    await screen.findByText('Zara Smith')

    const names = screen.getAllByTestId('student-name').map(el => el.textContent)
    expect(names[0]).toBe('Ana García')
    expect(names[1]).toBe('Zara Smith')
  })

  it('sort by CEFR Level orders students from A1 to C2', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'b', name: 'Bruno', cefrLevel: 'B2' }),
        makeStudent({ id: 'a', name: 'Ana', cefrLevel: 'A1' }),
      ])
    )
    wrapper(<Students />, '?sort=cefrLevel')
    await screen.findByText('Bruno')

    const names = screen.getAllByTestId('student-name').map(el => el.textContent)
    expect(names[0]).toBe('Ana')
    expect(names[1]).toBe('Bruno')
  })

  it('sort button opens dropdown and selecting an option changes sort', async () => {
    const recent = new Date(Date.now() - 2 * 86400000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'z', name: 'Zara Smith' }),
        makeStudent({ id: 'a', name: 'Ana García' }),
      ])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [
        makeActiveStudent({ studentId: 'z', name: 'Zara Smith', lastSessionDate: recent }),
      ],
    })
    wrapper(<Students />)
    await screen.findByText('Zara Smith')

    // Open the sort dropdown
    fireEvent.click(screen.getByTestId('sort-button'))
    expect(screen.getByTestId('sort-option-name')).toBeInTheDocument()

    // Select Name sort
    fireEvent.click(screen.getByTestId('sort-option-name'))

    const names = screen.getAllByTestId('student-name').map(el => el.textContent)
    expect(names[0]).toBe('Ana García')
    expect(names[1]).toBe('Zara Smith')
  })

  it('shows Inactive Xd badge in red for student with 20-day gap', async () => {
    const lastSession = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', lastSessionDate: lastSession, nextSessionDate: null })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Inactive 20d')).toBeInTheDocument()
  })

  it('shows Cancelled 2x badge when student had 2+ cancellations in last 30 days', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', cancelledSessionsLast30Days: 2 })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Cancelled 2x')).toBeInTheDocument()
  })

  it('shows NEW badge for student created 5 days ago with fewer than 3 sessions', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123', createdAt: recentDate })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', totalSessions: 1 })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('does not show NEW badge for student created 20 days ago', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', totalSessions: 1 })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.queryByText('NEW')).not.toBeInTheDocument()
  })

  it('shows Exam prep badge for student with objective due in 3 weeks', async () => {
    const targetDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({
        id: 'abc-123',
        shortTermObjectives: [{ id: 'obj1', text: 'DELE B2 exam', targetDate }],
      })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123' })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Exam prep')).toBeInTheDocument()
  })

  it('shows RETURNING badge for student inactive 35 days who now has upcoming session', async () => {
    const lastSession = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    const nextSession = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', lastSessionDate: lastSession, nextSessionDate: nextSession })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('RETURNING')).toBeInTheDocument()
    expect(screen.queryByText(/Inactive/)).not.toBeInTheDocument()
  })

  it('shows RETURNING badge for student inactive 22 days who has upcoming session (threshold is 21d)', async () => {
    const lastSession = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
    const nextSession = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', lastSessionDate: lastSession, nextSessionDate: nextSession })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('RETURNING')).toBeInTheDocument()
    expect(screen.queryByText(/Inactive/)).not.toBeInTheDocument()
  })

  it('shows load more button when students exceed page size and loads more on click', async () => {
    const students = Array.from({ length: 13 }, (_, i) =>
      makeStudent({ id: `s${i}`, name: `Student ${String(i).padStart(2, '0')}` })
    )
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse(students))
    wrapper(<Students />)
    await screen.findAllByTestId('student-name')

    expect(screen.getAllByTestId('student-name')).toHaveLength(12)
    expect(screen.getByTestId('load-more')).toBeInTheDocument()
    expect(screen.getByText('Showing 12 of 13 students')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('load-more'))
    expect(screen.getAllByTestId('student-name')).toHaveLength(13)
    expect(screen.queryByTestId('load-more')).not.toBeInTheDocument()
  })

  it('shows Next Session with time when session is today', async () => {
    const todayAt2PM = new Date()
    todayAt2PM.setHours(14, 30, 0, 0)
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null, todaySessions: [], pendingFollowups: [], upcomingThisWeek: [],
      activeStudents: [makeActiveStudent({ studentId: 'abc-123', nextSessionDate: todayAt2PM.toISOString() })],
    })
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText(/Today 14:30/)).toBeInTheDocument()
  })

  it('shows pagination count text', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent()])
    )
    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Showing 1 of 1 student')).toBeInTheDocument()
  })

  it('subtitle shows total count including "active" qualifier when no filter is active', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'a', name: 'Ana' }),
        makeStudent({ id: 'b', name: 'Bruno' }),
      ])
    )
    wrapper(<Students />)
    await screen.findAllByTestId('student-name')
    expect(screen.getByText('Managing 2 active language learners in your atelier')).toBeInTheDocument()
  })

  it('subtitle updates when CEFR filter is active', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'a', name: 'Ana', cefrLevel: 'B2' }),
        makeStudent({ id: 'b', name: 'Bruno', cefrLevel: 'A1' }),
      ])
    )
    wrapper(<Students />)
    await screen.findByText('Ana')

    fireEvent.click(screen.getByRole('button', { name: 'B2' }))
    expect(screen.getByText('Managing 1 B2 learner in your atelier')).toBeInTheDocument()
  })

  it('subtitle shows search result count when search is active', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([
        makeStudent({ id: 'a', name: 'Ana García' }),
        makeStudent({ id: 'b', name: 'Bruno Almeida' }),
      ])
    )
    wrapper(<Students />)
    await screen.findByText('Ana García')

    const input = screen.getByPlaceholderText('Search students...')
    fireEvent.change(input, { target: { value: 'Ana' } })

    expect(screen.getByText("Showing 1 result for 'Ana'")).toBeInTheDocument()
  })
})
