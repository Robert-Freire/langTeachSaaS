import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

const emptyDashboard = { nextSession: null, todaySessions: [], activeStudents: [] }

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
    createdAt: '',
    updatedAt: '',
    birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null,
    countryOfResidence: null, cityOfResidence: null, reasonForStudying: null,
    officialCefrLevel: null, shortTermObjectives: [], isActive: true, isCorporate: false,
    rate: null, spokenLanguages: [], teachingTodos: [],
    ...overrides,
  }
}

function makeListResponse(items: studentsApi.Student[]): studentsApi.StudentListResponse {
  return { items, totalCount: items.length, page: 1, pageSize: 100 }
}

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
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

  it('shows inline error when delete mutation fails', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(makeListResponse([makeStudent()]))
    vi.mocked(studentsApi.deleteStudent).mockRejectedValue(new Error('Server error'))

    wrapper(<Students />)
    await screen.findByTestId('student-name')
    fireEvent.click(screen.getByTestId('delete-student'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('confirm-delete'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('delete-error')).toHaveTextContent('Failed to delete student. Please try again.')
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

  it('renders dashboard-sourced signals when dashboard data available', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue(
      makeListResponse([makeStudent({ id: 'abc-123' })])
    )
    vi.mocked(dashboardApi.getDashboard).mockResolvedValue({
      nextSession: null,
      todaySessions: [],
      activeStudents: [
        {
          studentId: 'abc-123',
          name: 'Ana García',
          cefrLevel: 'B2',
          nativeLanguages: [],
          isActive: true,
          lastSessionDate: null,
          nextSessionDate: null,
          totalSessions: 0,
          teachingTodosCount: 3,
          pendingTodos: [],
        },
      ],
    })

    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('3 followups')).toBeInTheDocument()
  })
})
