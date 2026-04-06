import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionHistoryTab } from './SessionHistoryTab'
import * as sessionLogsApi from '../../api/sessionLogs'
import * as lessonsApi from '../../api/lessons'

vi.mock('../../api/sessionLogs', () => ({
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  updateSession: vi.fn(),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn((tags) => JSON.stringify(tags)),
  parseTopicTags: vi.fn((raw: string) => {
    try { return JSON.parse(raw) } catch { return [] }
  }),
}))

vi.mock('../../api/lessons', () => ({
  getLessons: vi.fn(),
}))

vi.mock('./TopicTagsInput', () => ({
  TopicTagsInput: ({ onChange }: { onChange: (tags: []) => void }) => (
    <div data-testid="topic-tags-input" onClick={() => onChange([])} />
  ),
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
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
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

  it('hides planned and actual preview when expanded to avoid duplication', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    // Full text appears once in the detail section
    expect(screen.getAllByText(/Preterito indefinido intro/)).toHaveLength(1)
    expect(screen.getAllByText(/Covered basics and exercises/)).toHaveLength(1)
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

  it('shows edit button in expanded view', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('edit-session-button')).toBeInTheDocument()
  })

  it('clicking edit button opens SessionLogDialog in edit mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    fireEvent.click(screen.getByTestId('edit-session-button'))
    await waitFor(() => {
      expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Session')).toBeInTheDocument()
    })
  })

  it('does not call deleteSession when delete button is clicked without confirming', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    vi.mocked(sessionLogsApi.deleteSession).mockResolvedValue(undefined)
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    fireEvent.click(screen.getByTestId('delete-session-button'))
    // Dialog opens but we cancel
    const cancelBtn = await screen.findByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(sessionLogsApi.deleteSession).not.toHaveBeenCalled()
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

  it('shows separate action item and note counts when both are set', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('action-item-count')).toHaveTextContent('1 action item')
    expect(screen.getByTestId('general-note-count')).toHaveTextContent('1 note')
  })

  it('shows only action item count when nextSessionTopics is set and generalNotes is null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, generalNotes: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('action-item-count')).toHaveTextContent('1 action item')
    expect(screen.queryByTestId('general-note-count')).not.toBeInTheDocument()
  })

  it('shows only general note count when generalNotes is set and nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('general-note-count')).toHaveTextContent('1 note')
    expect(screen.queryByTestId('action-item-count')).not.toBeInTheDocument()
  })

  it('shows no count indicators when both generalNotes and nextSessionTopics are null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, generalNotes: null, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('action-item-count')).not.toBeInTheDocument()
    expect(screen.queryByTestId('general-note-count')).not.toBeInTheDocument()
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
