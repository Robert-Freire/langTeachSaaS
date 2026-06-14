import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionHistoryTab } from './SessionHistoryTab'
import * as sessionLogsApi from '../../api/sessionLogs'
import * as lessonsApi from '../../api/lessons'
import * as useSessionAutosaveModule from '../../hooks/useSessionAutosave'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../api/sessionLogs', () => ({
  listSessions: vi.fn(),
  listSessionsIncludingGroups: vi.fn(),
  deleteSession: vi.fn(),
  updateSession: vi.fn(),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn((tags) => JSON.stringify(tags)),
  parseTopicTags: vi.fn((raw: string) => {
    try { return JSON.parse(raw) } catch { return [] }
  }),
}))

vi.mock('../../hooks/useSessionAutosave', () => ({
  useSessionAutosave: vi.fn(() => ({
    status: 'idle' as const,
    sessionId: 'session-1',
    lastSavedAt: null,
    scheduleTextSave: vi.fn(),
    saveNow: vi.fn().mockResolvedValue('session-1'),
  })),
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
  groupId: null,
  targetType: 'student',
  targetName: 'Ana García',
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
  isCancelled: false,
  status: 0,
  statusName: 'Confirmed' as const,
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  duration: null,
  title: null,
  hasVoiceNote: false,
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
    mockNavigate.mockClear()
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('shows loading skeletons while fetching', () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockReturnValue(new Promise(() => {}))
    wrapper()
    expect(screen.getByTestId('session-history-loading')).toBeInTheDocument()
  })

  it('shows empty state when no sessions', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([])
    wrapper()
    expect(await screen.findByTestId('session-history-empty')).toBeInTheDocument()
    expect(screen.getByText(/No sessions logged yet/)).toBeInTheDocument()
  })

  it('shows error state when fetch fails, with retry button', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockRejectedValue(new Error('Network error'))
    wrapper()
    expect(await screen.findByTestId('session-history-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('renders session entries when data loads', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    expect(await screen.findAllByTestId('session-entry')).toHaveLength(1)
  })

  it('shows actualContent snippet in collapsed state with line-clamp-1 when title exists', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, title: 'Preterito Indefinido' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    const actualEl = screen.getByText(/Covered basics and exercises/)
    expect(actualEl).toBeInTheDocument()
    expect(actualEl.closest('p')).toHaveClass('line-clamp-1')
    // plannedContent is NOT shown in collapsed state
    expect(screen.queryByText(/Preterito indefinido intro/)).not.toBeInTheDocument()
  })

  it('shows actualContent snippet with line-clamp-2 when no title', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, title: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    const actualEl = screen.getByText(/Covered basics and exercises/)
    expect(actualEl.closest('p')).toHaveClass('line-clamp-2')
  })

  it('hides actualContent snippet when expanded and shows it in detail section as editable input', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    // actualContent appears in the editable narrative input
    const narrativeInput = screen.getByTestId('session-narrative-input')
    expect(narrativeInput).toHaveValue('Covered basics and exercises')
    // plannedContent appears in the detail (since it differs from actualContent)
    expect(screen.getByText(/Preterito indefinido intro/)).toBeInTheDocument()
  })

  it('shows previous homework status badge in expanded view', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(await screen.findByTestId('hw-status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('hw-status-badge')).toHaveTextContent('Done')
  })

  it('expands entry on click to show full detail', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('session-entry-detail')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    expect(screen.getByText('Student is engaged')).toBeInTheDocument()
    expect(screen.getByText('Review irregular verbs')).toBeInTheDocument()
  })

  it('collapses entry on second click', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('session-entry-detail')).not.toBeInTheDocument()
  })

  it('shows group-session pill for group session', async () => {
    const groupSession: sessionLogsApi.SessionLog = {
      ...SESSION_BASE,
      studentId: null,
      groupId: 'group-1',
      targetType: 'group',
      targetName: 'B1 Conversacion',
    }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([groupSession])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('group-session-pill')).toHaveTextContent('B1 Conversacion')
  })

  it('shows "View in group" link and no delete button for group session', async () => {
    const groupSession: sessionLogsApi.SessionLog = {
      ...SESSION_BASE,
      studentId: null,
      groupId: 'group-1',
      targetType: 'group',
      targetName: 'B1 Conversacion',
    }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([groupSession])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('view-in-group-link')).toBeInTheDocument()
    expect(screen.queryByTestId('delete-session-btn')).not.toBeInTheDocument()
  })

  it('filters to group sessions only when sessionType=groups', async () => {
    const studentSession = { ...SESSION_BASE }
    const groupSession: sessionLogsApi.SessionLog = {
      ...SESSION_BASE,
      id: 'session-2',
      studentId: null,
      groupId: 'group-1',
      targetType: 'group',
      targetName: 'B1 Conversacion',
    }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([studentSession, groupSession])
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/?sessionType=groups']}>
          <SessionHistoryTab studentId="student-1" sessionTypeFilter="groups" />
        </MemoryRouter>
      </QueryClientProvider>
    )
    await screen.findByTestId('session-entry')
    const entries = screen.getAllByTestId('session-entry')
    expect(entries).toHaveLength(1)
    expect(screen.getByTestId('group-session-pill')).toBeInTheDocument()
  })

  it('renders the session-type filter as a pill-toggle group matching the status pills, not a dropdown', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')

    const typeFilter = screen.getByTestId('session-type-filter')
    expect(typeFilter).toBeInTheDocument()
    // Default option is "All types" (not a bare "All" that would duplicate the status filter)
    expect(screen.getByTestId('session-type-filter-all')).toHaveTextContent('All types')
    expect(screen.getByTestId('session-type-filter-1-to-1')).toHaveTextContent('1-to-1')
    expect(screen.getByTestId('session-type-filter-groups')).toHaveTextContent('Groups')
    // Old Radix Select dropdown is gone
    expect(typeFilter.querySelector('[role="combobox"]')).toBeNull()
  })

  it('shows topic tag chips with category colors in expanded view', async () => {
    const session = {
      ...SESSION_BASE,
      topicTags: JSON.stringify([
        { tag: 'preterito indefinido', category: 'grammar' },
        { tag: 'viajes', category: 'vocabulary' },
      ]),
    }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([session])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const chips = screen.getAllByTestId('topic-tag-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveTextContent('preterito indefinido')
    expect(chips[1]).toHaveTextContent('viajes')
  })

  it('does not show kebab trigger in the collapsed row', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('session-kebab-trigger')).not.toBeInTheDocument()
  })

  it('shows delete button in expanded row', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(await screen.findByTestId('delete-session-btn')).toBeInTheDocument()
  })

  it('does not call deleteSession when delete button is clicked without confirming', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    vi.mocked(sessionLogsApi.deleteSession).mockResolvedValue(undefined)
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const deleteBtn = await screen.findByTestId('delete-session-btn')
    fireEvent.click(deleteBtn)
    // Dialog opens but we cancel
    const cancelBtn = await screen.findByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(sessionLogsApi.deleteSession).not.toHaveBeenCalled()
  })

  it('calls deleteSession and invalidates query on confirm', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    vi.mocked(sessionLogsApi.deleteSession).mockResolvedValue(undefined)
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const deleteBtn = await screen.findByTestId('delete-session-btn')
    fireEvent.click(deleteBtn)
    const confirmBtn = await screen.findByTestId('confirm-delete-session')
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(sessionLogsApi.deleteSession).toHaveBeenCalledWith('student-1', 'session-1')
    })
  })

  it('shows session title as editable input in expanded state', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, title: 'My Session' }])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const titleInput = screen.getByTestId('session-title-input')
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).toHaveValue('My Session')
    expect(screen.queryByTestId('session-title-display')).not.toBeInTheDocument()
  })

  it('shows session narrative as editable textarea in expanded state', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const narrativeInput = screen.getByTestId('session-narrative-input')
    expect(narrativeInput).toBeInTheDocument()
    expect(narrativeInput).toHaveValue('Covered basics and exercises')
    expect(screen.queryByTestId('session-narrative-display')).not.toBeInTheDocument()
  })

  it('shows separate action item and note counts when both are set', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('action-item-count')).toHaveTextContent('1 action item')
    expect(screen.getByTestId('general-note-count')).toHaveTextContent('1 note')
  })

  it('shows only action item count when nextSessionTopics is set and generalNotes is null', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, generalNotes: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('action-item-count')).toHaveTextContent('1 action item')
    expect(screen.queryByTestId('general-note-count')).not.toBeInTheDocument()
  })

  it('shows only general note count when generalNotes is set and nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('general-note-count')).toHaveTextContent('1 note')
    expect(screen.queryByTestId('action-item-count')).not.toBeInTheDocument()
  })

  it('shows no count indicators when both generalNotes and nextSessionTopics are null', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, generalNotes: null, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('action-item-count')).not.toBeInTheDocument()
    expect(screen.queryByTestId('general-note-count')).not.toBeInTheDocument()
  })

  it('shows date badge with month and day for a session', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2026-03-30T00:00:00Z' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    // Date badge shows month abbreviation and day
    expect(screen.getByText('MAR')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows Cancelled badge for a cancelled session', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, isCancelled: true }])
    wrapper()
    expect(await screen.findByTestId('cancelled-badge')).toBeInTheDocument()
    expect(screen.getByTestId('cancelled-badge')).toHaveTextContent('Cancelled')
  })

  it('does not show Cancelled badge for a non-cancelled session', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('cancelled-badge')).not.toBeInTheDocument()
  })

  it('shows "Pending review" badge for a Draft session', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, status: 1, statusName: 'Draft' as const },
    ])
    wrapper()
    expect(await screen.findByTestId('draft-badge')).toBeInTheDocument()
    expect(screen.getByTestId('draft-badge')).toHaveTextContent('Pending review')
  })

  it('does not show "Pending review" badge for a Confirmed session', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('draft-badge')).not.toBeInTheDocument()
  })

  it('action item badge contains a chevron icon for expand affordance', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const badge = screen.getByTestId('action-item-count')
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('general note badge contains a chevron icon for expand affordance', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const badge = screen.getByTestId('general-note-count')
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('shows next session topics preview line in collapsed state when nextSessionTopics is set', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const preview = screen.getByTestId('next-session-topics-preview')
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveTextContent('Next:')
    expect(preview).toHaveTextContent('Review irregular verbs')
  })

  it('does not show next session topics preview when nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('next-session-topics-preview')).not.toBeInTheDocument()
  })

  it('shows next plan as editable textarea with amber heading in expanded state', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByText('Planned for next class')).toBeInTheDocument()
    const nextPlanInput = screen.getByTestId('session-next-plan-input')
    expect(nextPlanInput).toBeInTheDocument()
    expect(nextPlanInput).toHaveValue('Review irregular verbs')
    expect(screen.queryByTestId('session-next-plan-display')).not.toBeInTheDocument()
  })

  it('does not show start-next-session-button when nextSessionTopics is null and local input is empty', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('start-next-session-button')).not.toBeInTheDocument()
  })

  it('shows "Start next session" button when nextSessionTopics is non-empty', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('start-next-session-button')).toBeInTheDocument()
  })

  it('does not show "Start next session" button when nextSessionTopics is null and local input empty', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('start-next-session-button')).not.toBeInTheDocument()
  })

  it('clicking "Start next session" navigates to log-session page', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    fireEvent.click(screen.getByTestId('start-next-session-button'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/students/student-1/log-session`)
    })
  })

  it('shows Total Hours stat when sessions have duration', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, duration: 60 }])
    wrapper()
    await screen.findByTestId('total-hours-stat')
    expect(screen.getByTestId('total-hours-value')).toHaveTextContent('1')
  })

  it('hides Total Hours stat when all sessions have null duration', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('total-hours-stat')).not.toBeInTheDocument()
  })

  it('filters sessions by search query on title and content', async () => {
    const sessionA = { ...SESSION_BASE, id: 'a', title: 'Subjunctive Usage', actualContent: 'Covered subjunctive' }
    const sessionB = { ...SESSION_BASE, id: 'b', title: 'Business Spanish', actualContent: 'Corporate vocabulary' }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([sessionA, sessionB])
    wrapper()
    await screen.findAllByTestId('session-entry')
    const input = screen.getByTestId('session-search-input')
    fireEvent.change(input, { target: { value: 'subjunctive' } })
    await waitFor(() => {
      expect(screen.getAllByTestId('session-entry')).toHaveLength(1)
    })
    expect(screen.getByText('Subjunctive Usage')).toBeInTheDocument()
    expect(screen.queryByText('Business Spanish')).not.toBeInTheDocument()
  })

  it('shows only cancelled sessions when Cancelled filter is active', async () => {
    const cancelled = { ...SESSION_BASE, id: 'c', isCancelled: true }
    const normal = { ...SESSION_BASE, id: 'n', isCancelled: false }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([cancelled, normal])
    wrapper()
    await screen.findAllByTestId('session-entry')
    fireEvent.click(screen.getByTestId('status-filter-cancelled'))
    await waitFor(() => {
      expect(screen.getAllByTestId('session-entry')).toHaveLength(1)
    })
    expect(screen.getByTestId('cancelled-badge')).toBeInTheDocument()
  })

  it('shows Load earlier sessions button when sessions exceed page size', async () => {
    const sessions = Array.from({ length: 16 }, (_, i) => ({
      ...SESSION_BASE,
      id: `s-${i}`,
      sessionDate: new Date(2026, 0, 16 - i).toISOString(),
    }))
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue(sessions)
    wrapper()
    await screen.findAllByTestId('session-entry')
    expect(screen.getByTestId('load-earlier-sessions')).toBeInTheDocument()
    expect(screen.getAllByTestId('session-entry')).toHaveLength(15)
  })

  it('loads more sessions on Load earlier button click', async () => {
    const sessions = Array.from({ length: 16 }, (_, i) => ({
      ...SESSION_BASE,
      id: `s-${i}`,
      sessionDate: new Date(2026, 0, 16 - i).toISOString(),
    }))
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue(sessions)
    wrapper()
    await screen.findAllByTestId('session-entry')
    fireEvent.click(screen.getByTestId('load-earlier-sessions'))
    await waitFor(() => {
      expect(screen.getAllByTestId('session-entry')).toHaveLength(16)
    })
    expect(screen.queryByTestId('load-earlier-sessions')).not.toBeInTheDocument()
  })

  it('shows mic icon when hasVoiceNote is true', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, hasVoiceNote: true }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('voice-note-icon')).toBeInTheDocument()
  })

  it('does not show mic icon when hasVoiceNote is false', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('voice-note-icon')).not.toBeInTheDocument()
  })

  it('shows duration badge when duration is set', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, duration: 60 }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('duration-badge')).toHaveTextContent('60 min')
  })

  it('shows session title when title is set', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, title: 'Subjunctive Usage in Time Clauses' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText('Subjunctive Usage in Time Clauses')).toBeInTheDocument()
  })

  it('shows 0 min duration badge for cancelled sessions without duration', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, isCancelled: true, duration: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('duration-badge')).toHaveTextContent('0 min')
  })

  it('filters sessions by date range', async () => {
    const sessionOld = { ...SESSION_BASE, id: 'old', sessionDate: '2026-01-01T00:00:00Z' }
    const sessionNew = { ...SESSION_BASE, id: 'new', sessionDate: '2026-03-30T00:00:00Z' }
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([sessionNew, sessionOld])
    wrapper()
    await screen.findAllByTestId('session-entry')
    fireEvent.click(screen.getByTestId('date-range-button'))
    const fromInput = await screen.findByTestId('date-from-input')
    fireEvent.change(fromInput, { target: { value: '2026-03-01' } })
    await waitFor(() => {
      expect(screen.getAllByTestId('session-entry')).toHaveLength(1)
    })
  })

  it('falls back to Session date format when no title', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, title: null, sessionDate: '2026-04-05T10:00:00Z' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText(/Session, Apr 5/)).toBeInTheDocument()
  })

  it('shows homework status icon in collapsed row when previousHomeworkStatusName is set', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, previousHomeworkStatusName: 'Done' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('hw-status-icon')).toBeInTheDocument()
    expect(screen.getByTestId('hw-status-icon')).toHaveTextContent('✓')
  })

  it('shows x icon when homework not done', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, previousHomeworkStatusName: 'NotDone', previousHomeworkStatus: 2 },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('hw-status-icon')).toHaveTextContent('✗')
  })

  it('shows half-circle icon when homework partially done', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, previousHomeworkStatusName: 'Partial', previousHomeworkStatus: 3 },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('hw-status-icon')).toHaveTextContent('◑')
  })

  it('does not show homework status icon when previousHomeworkStatusName is empty', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, previousHomeworkStatusName: '', previousHomeworkStatus: 0 },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('hw-status-icon')).not.toBeInTheDocument()
  })

  it('does not show homework status icon when status is NotApplicable', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, previousHomeworkStatusName: 'NotApplicable', previousHomeworkStatus: 3 },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('hw-status-icon')).not.toBeInTheDocument()
  })

  it('always uses two-column layout in expanded state (next-plan textarea always present)', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      {
        ...SESSION_BASE,
        homeworkAssigned: null,
        nextSessionTopics: null,
        previousHomeworkStatusName: '',
        previousHomeworkStatus: 0,
      },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const detail = screen.getByTestId('session-entry-detail')
    const grid = detail.querySelector('.grid')
    expect(grid?.className).toContain('md:grid-cols-3')
  })

  it('shows "Logged" timestamp in expanded session row', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const timestamps = screen.getByTestId('session-timestamps')
    expect(timestamps).toHaveTextContent(/Logged/)
  })

  it('shows "Edited" timestamp when updatedAt differs from createdAt by more than 60s', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{
      ...SESSION_BASE,
      createdAt: '2026-03-30T10:00:00Z',
      updatedAt: '2026-03-30T10:05:00Z',
    }])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const timestamps = screen.getByTestId('session-timestamps')
    expect(timestamps).toHaveTextContent(/Logged/)
    expect(timestamps).toHaveTextContent(/Edited/)
  })

  it('does not show "Edited" when updatedAt is within 60s of createdAt', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{
      ...SESSION_BASE,
      createdAt: '2026-03-30T10:00:00Z',
      updatedAt: '2026-03-30T10:00:30Z',
    }])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const timestamps = screen.getByTestId('session-timestamps')
    expect(timestamps).toHaveTextContent(/Logged/)
    expect(timestamps).not.toHaveTextContent(/Edited/)
  })

  it('expanded row shows "Edit full session" link pointing to log-session with sessionId', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const link = screen.getByTestId('edit-full-session-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/students/student-1/sessions/session-1/edit')
  })

  it('shows Scheduled badge for a Confirmed session with a far-future date', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2099-01-15T00:00:00Z' },
    ])
    wrapper()
    expect(await screen.findByTestId('scheduled-badge')).toBeInTheDocument()
    expect(screen.getByTestId('scheduled-badge')).toHaveTextContent('Scheduled')
    expect(screen.queryByTestId('completed-badge')).not.toBeInTheDocument()
  })

  it('shows Completed badge for a Confirmed session with a past date', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2020-06-10T00:00:00Z' },
    ])
    wrapper()
    expect(await screen.findByTestId('completed-badge')).toBeInTheDocument()
    expect(screen.getByTestId('completed-badge')).toHaveTextContent('Completed')
    expect(screen.queryByTestId('scheduled-badge')).not.toBeInTheDocument()
  })

  it('does not show Scheduled badge for a Draft session with a future date', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2099-01-15T00:00:00Z', status: 1, statusName: 'Draft' as const },
    ])
    wrapper()
    expect(await screen.findByTestId('draft-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('scheduled-badge')).not.toBeInTheDocument()
  })

  it('does not show Scheduled badge for a cancelled session with a future date', async () => {
    vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2099-01-15T00:00:00Z', isCancelled: true },
    ])
    wrapper()
    expect(await screen.findByTestId('cancelled-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('scheduled-badge')).not.toBeInTheDocument()
  })

  describe('inline edit autosave', () => {
    it('expanding a row renders all four editable inputs', async () => {
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
      wrapper()
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      expect(screen.getByTestId('session-title-input')).toBeInTheDocument()
      expect(screen.getByTestId('session-narrative-input')).toBeInTheDocument()
      expect(screen.getByTestId('session-duration-input')).toBeInTheDocument()
      expect(screen.getByTestId('session-next-plan-input')).toBeInTheDocument()
    })

    it('title input initialises with empty string when session.title is null', async () => {
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([{ ...SESSION_BASE, title: null }])
      wrapper()
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      expect(screen.getByTestId('session-title-input')).toHaveValue('')
    })

    it('blurring title input calls saveNow', async () => {
      const saveNowMock = vi.fn().mockResolvedValue('session-1')
      vi.mocked(useSessionAutosaveModule.useSessionAutosave).mockReturnValue({
        status: 'idle',
        sessionId: 'session-1',
        lastSavedAt: null,
        scheduleTextSave: vi.fn(),
        saveNow: saveNowMock,
      })
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
      wrapper()
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      const input = screen.getByTestId('session-title-input')
      fireEvent.change(input, { target: { value: 'New Title' } })
      fireEvent.blur(input)
      await waitFor(() => expect(saveNowMock).toHaveBeenCalled())
    })

    it('collapsing an expanded row calls saveNow', async () => {
      const saveNowMock = vi.fn().mockResolvedValue('session-1')
      vi.mocked(useSessionAutosaveModule.useSessionAutosave).mockReturnValue({
        status: 'idle',
        sessionId: 'session-1',
        lastSavedAt: null,
        scheduleTextSave: vi.fn(),
        saveNow: saveNowMock,
      })
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
      wrapper()
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      await screen.findByTestId('session-entry-detail')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      await waitFor(() => expect(saveNowMock).toHaveBeenCalled())
    })

    it('SavedIndicator appears when saveStatus is saved', async () => {
      vi.mocked(useSessionAutosaveModule.useSessionAutosave).mockReturnValue({
        status: 'saved',
        sessionId: 'session-1',
        lastSavedAt: null,
        scheduleTextSave: vi.fn(),
        saveNow: vi.fn().mockResolvedValue('session-1'),
      })
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
      wrapper()
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      expect(await screen.findByTestId('saved-indicator')).toBeInTheDocument()
    })

    it('after RQ cache update on save, edited value persists when row is reopened', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const updatedSession: sessionLogsApi.SessionLog = { ...SESSION_BASE, title: 'Saved Title' }
      vi.mocked(sessionLogsApi.listSessionsIncludingGroups).mockResolvedValue([SESSION_BASE])
      vi.mocked(useSessionAutosaveModule.useSessionAutosave).mockImplementation(
        () => {
          return {
            status: 'idle' as const,
            sessionId: 'session-1',
            lastSavedAt: null,
            scheduleTextSave: vi.fn(),
            saveNow: vi.fn().mockImplementation(async () => {
              queryClient.setQueryData<sessionLogsApi.SessionLog[]>(['sessions-all', 'student-1'], [updatedSession])
              return 'session-1'
            }),
          }
        },
      )
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SessionHistoryTab studentId="student-1" />
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await screen.findByTestId('session-entry')
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      await screen.findByTestId('session-entry-detail')
      const input = screen.getByTestId('session-title-input')
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Saved Title' } })
        fireEvent.blur(input)
      })
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      await waitFor(() => expect(screen.queryByTestId('session-entry-detail')).not.toBeInTheDocument())
      fireEvent.click(screen.getByTestId('session-entry-toggle'))
      await waitFor(() => {
        expect(screen.getByTestId('session-title-input')).toHaveValue('Saved Title')
      })
    })
  })
})
