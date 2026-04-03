import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionHistoryTab } from './SessionHistoryTab'
import * as sessionLogsApi from '../../api/sessionLogs'

vi.mock('../../api/sessionLogs', () => ({
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  parseTopicTags: vi.fn((raw: string) => {
    try { return JSON.parse(raw) } catch { return [] }
  }),
}))

const SESSION_BASE: sessionLogsApi.SessionLog = {
  id: 'session-1',
  studentId: 'student-1',
  sessionDate: '2026-03-30T00:00:00Z',
  plannedContent: 'Preterito indefinido intro',
  actualContent: 'Covered basics and exercises',
  homeworkAssigned: 'Page 45 exercises',
  previousHomeworkStatus: 1,
  previousHomeworkStatusName: 'Done',
  nextSessionTopics: 'Review irregular verbs',
  generalNotes: 'Student is engaged',
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
  topicTags: '[]',
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-30T10:00:00Z',
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionHistoryTab studentId="student-1" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SessionHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeletons while fetching', () => {
    vi.mocked(sessionLogsApi.listSessions).mockReturnValue(new Promise(() => {}))
    wrapper()
    expect(screen.getByTestId('session-history-loading')).toBeInTheDocument()
  })

  it('shows empty state when no sessions', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    wrapper()
    expect(await screen.findByTestId('session-history-empty')).toBeInTheDocument()
    expect(screen.getByText(/No sessions logged yet/)).toBeInTheDocument()
  })

  it('shows error state when fetch fails, with retry button', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockRejectedValue(new Error('Network error'))
    wrapper()
    expect(await screen.findByTestId('session-history-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('renders session entries when data loads', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    expect(await screen.findAllByTestId('session-entry')).toHaveLength(1)
  })

  it('shows inline preview with truncated planned and actual content', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText(/Preterito indefinido intro/)).toBeInTheDocument()
    expect(screen.getByText(/Covered basics and exercises/)).toBeInTheDocument()
  })

  it('shows previous homework status badge', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    expect(await screen.findByTestId('hw-status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('hw-status-badge')).toHaveTextContent('HW: Done')
  })

  it('expands entry on click to show full detail', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('session-entry-detail')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    expect(screen.getByText('Student is engaged')).toBeInTheDocument()
    expect(screen.getByText('Review irregular verbs')).toBeInTheDocument()
  })

  it('collapses entry on second click', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('session-entry-detail')).not.toBeInTheDocument()
  })

  it('shows topic tag chips with category colors in expanded view', async () => {
    const session = {
      ...SESSION_BASE,
      topicTags: JSON.stringify([
        { tag: 'preterito indefinido', category: 'grammar' },
        { tag: 'viajes', category: 'vocabulary' },
      ]),
    }
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([session])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const chips = screen.getAllByTestId('topic-tag-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveTextContent('preterito indefinido')
    expect(chips[1]).toHaveTextContent('viajes')
  })

  it('shows delete button in expanded view', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('delete-session-button')).toBeInTheDocument()
  })

  it('calls deleteSession and invalidates query on confirm', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    vi.mocked(sessionLogsApi.deleteSession).mockResolvedValue(undefined)
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    fireEvent.click(screen.getByTestId('delete-session-button'))
    const confirmBtn = await screen.findByTestId('confirm-delete-session')
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(sessionLogsApi.deleteSession).toHaveBeenCalledWith('student-1', 'session-1')
    })
  })

  it('shows notes count when generalNotes and nextSessionTopics are set', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText(/2 notes/)).toBeInTheDocument()
  })

  it('shows relative time label: "today" for same-day session', async () => {
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00Z'
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, sessionDate: today }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText('today')).toBeInTheDocument()
  })

  it('shows relative time label: "N days ago" for recent session', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, sessionDate: threeDaysAgo }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText('3 days ago')).toBeInTheDocument()
  })

  it('shows relative time label: "N weeks ago" for a session 2 weeks ago', async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, sessionDate: twoWeeksAgo }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText('2 weeks ago')).toBeInTheDocument()
  })
})
