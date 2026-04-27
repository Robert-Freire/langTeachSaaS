import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Sessions from './Sessions'
import type { SessionsListData } from '@/api/sessions'

const mockGetSessionsList = vi.fn()

vi.mock('@/api/sessions', () => ({
  getSessionsList: (...args: unknown[]) => mockGetSessionsList(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeEmptyData(): SessionsListData {
  return {
    upcoming: [],
    today: [],
    recent: [],
    students: [],
  }
}

function makeDataWithSessions(): SessionsListData {
  return {
    upcoming: [
      {
        sessionLogId: 'sl-future',
        studentId: 'student-1',
        studentName: 'Ana García',
        studentCefrLevel: 'B1',
        sessionDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        plannedContent: 'Subjunctive intro',
        status: 'Confirmed',
      },
    ],
    today: [
      {
        sessionLogId: 'sl-today',
        studentId: 'student-2',
        studentName: 'Marco Rossi',
        studentCefrLevel: 'A2',
        sessionDate: new Date().toISOString(),
        plannedContent: null,
        status: 'Confirmed',
      },
    ],
    recent: [
      {
        sessionLogId: 'sl-recent',
        studentId: 'student-1',
        studentName: 'Ana García',
        studentCefrLevel: 'B1',
        sessionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        plannedContent: 'Grammar review',
        status: 'Confirmed',
      },
    ],
    students: [
      { studentId: 'student-1', name: 'Ana García', cefrLevel: 'B1' },
      { studentId: 'student-2', name: 'Marco Rossi', cefrLevel: 'A2' },
    ],
  }
}

function renderSessions() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sessions page', () => {
  beforeEach(() => {
    mockGetSessionsList.mockReset()
    mockNavigate.mockReset()
  })

  it('shows skeleton while loading', () => {
    mockGetSessionsList.mockReturnValue(new Promise(() => {}))
    renderSessions()
    expect(screen.getByTestId('sessions-skeleton')).toBeTruthy()
  })

  it('shows empty state when all sections are empty', async () => {
    mockGetSessionsList.mockResolvedValue(makeEmptyData())
    renderSessions()
    expect(await screen.findByTestId('sessions-empty')).toBeTruthy()
    expect(screen.getByText('No sessions found')).toBeTruthy()
  })

  it('renders all three sections when data present', async () => {
    mockGetSessionsList.mockResolvedValue(makeDataWithSessions())
    renderSessions()
    expect(await screen.findByTestId('sessions-list')).toBeTruthy()
    expect(screen.getAllByText('Ana García').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Marco Rossi').length).toBeGreaterThanOrEqual(1)
  })

  it('shows student filter with loaded students', async () => {
    mockGetSessionsList.mockResolvedValue(makeDataWithSessions())
    renderSessions()
    await screen.findByTestId('sessions-list')
    expect(screen.getByTestId('student-filter')).toBeTruthy()
  })

  it('row click navigates to LogSession edit mode', async () => {
    mockGetSessionsList.mockResolvedValue(makeDataWithSessions())
    renderSessions()
    await screen.findByTestId('sessions-list')
    const row = screen.getByTestId('session-row-sl-future')
    fireEvent.click(row)
    expect(mockNavigate).toHaveBeenCalledWith('/students/student-1/sessions/sl-future/edit', { state: { from: 'sessions' } })
  })

  it('calls getSessionsList initially without studentId', async () => {
    mockGetSessionsList.mockResolvedValue(makeDataWithSessions())
    renderSessions()
    await screen.findByTestId('sessions-list')
    // Initial unfiltered fetch
    expect(mockGetSessionsList).toHaveBeenCalledWith(undefined)
  })
})
