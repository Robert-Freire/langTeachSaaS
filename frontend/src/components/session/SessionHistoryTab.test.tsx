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

  it('shows actualContent snippet in collapsed state with line-clamp-1', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const actualEl = screen.getByText(/Covered basics and exercises/)
    expect(actualEl).toBeInTheDocument()
    expect(actualEl.closest('p')).toHaveClass('line-clamp-1')
    // plannedContent is NOT shown in collapsed state
    expect(screen.queryByText(/Preterito indefinido intro/)).not.toBeInTheDocument()
  })

  it('hides actualContent snippet when expanded and shows it in detail section', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('session-entry-detail')).toBeInTheDocument()
    // actualContent appears exactly once (in the narrative section, not also in collapsed row)
    expect(screen.getAllByText(/Covered basics and exercises/)).toHaveLength(1)
    // plannedContent appears in the detail (since it differs from actualContent)
    expect(screen.getByText(/Preterito indefinido intro/)).toBeInTheDocument()
  })

  it('shows previous homework status badge in expanded view', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(await screen.findByTestId('hw-status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('hw-status-badge')).toHaveTextContent('Done')
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

  it('shows date badge with month and day for a session', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, sessionDate: '2026-03-30T00:00:00Z' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    // Date badge shows month abbreviation and day
    expect(screen.getByText('MAR')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows Cancelled badge for a cancelled session', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, isCancelled: true }])
    wrapper()
    expect(await screen.findByTestId('cancelled-badge')).toBeInTheDocument()
    expect(screen.getByTestId('cancelled-badge')).toHaveTextContent('Cancelled')
  })

  it('does not show Cancelled badge for a non-cancelled session', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('cancelled-badge')).not.toBeInTheDocument()
  })

  it('shows "Pending review" badge for a Draft session', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, status: 1, statusName: 'Draft' as const },
    ])
    wrapper()
    expect(await screen.findByTestId('draft-badge')).toBeInTheDocument()
    expect(screen.getByTestId('draft-badge')).toHaveTextContent('Pending review')
  })

  it('does not show "Pending review" badge for a Confirmed session', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('draft-badge')).not.toBeInTheDocument()
  })

  it('action item badge contains a chevron icon for expand affordance', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const badge = screen.getByTestId('action-item-count')
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('general note badge contains a chevron icon for expand affordance', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const badge = screen.getByTestId('general-note-count')
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('shows next session topics preview line in collapsed state when nextSessionTopics is set', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    const preview = screen.getByTestId('next-session-topics-preview')
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveTextContent('Next:')
    expect(preview).toHaveTextContent('Review irregular verbs')
  })

  it('does not show next session topics preview when nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('next-session-topics-preview')).not.toBeInTheDocument()
  })

  it('shows next session topics section with amber styling in expanded state', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    const section = screen.getByTestId('next-session-topics-section')
    expect(section).toBeInTheDocument()
    expect(section).toHaveTextContent('Planned for next class')
    expect(section).toHaveTextContent('Review irregular verbs')
  })

  it('does not show next session topics section when nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('next-session-topics-section')).not.toBeInTheDocument()
  })

  it('shows "Start next session" button in expanded view when nextSessionTopics is non-empty', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.getByTestId('start-next-session-button')).toBeInTheDocument()
  })

  it('does not show "Start next session" button when nextSessionTopics is null', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, nextSessionTopics: null },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    expect(screen.queryByTestId('start-next-session-button')).not.toBeInTheDocument()
  })

  it('clicking "Start next session" opens Log Session dialog with planned content pre-filled', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    fireEvent.click(screen.getByTestId('session-entry-toggle'))
    fireEvent.click(screen.getByTestId('start-next-session-button'))
    await waitFor(() => {
      expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument()
      expect(screen.getByText('Log Session')).toBeInTheDocument()
    })
    const plannedField = screen.getByTestId('planned-content') as HTMLTextAreaElement
    expect(plannedField.value).toBe('Review irregular verbs')
  })

  it('shows Total Hours stat when sessions have duration', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, duration: 60 }])
    wrapper()
    await screen.findByTestId('total-hours-stat')
    expect(screen.getByTestId('total-hours-value')).toHaveTextContent('1')
  })

  it('hides Total Hours stat when all sessions have null duration', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('total-hours-stat')).not.toBeInTheDocument()
  })

  it('filters sessions by search query on title and content', async () => {
    const sessionA = { ...SESSION_BASE, id: 'a', title: 'Subjunctive Usage', actualContent: 'Covered subjunctive' }
    const sessionB = { ...SESSION_BASE, id: 'b', title: 'Business Spanish', actualContent: 'Corporate vocabulary' }
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([sessionA, sessionB])
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
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([cancelled, normal])
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
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue(sessions)
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
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue(sessions)
    wrapper()
    await screen.findAllByTestId('session-entry')
    fireEvent.click(screen.getByTestId('load-earlier-sessions'))
    await waitFor(() => {
      expect(screen.getAllByTestId('session-entry')).toHaveLength(16)
    })
    expect(screen.queryByTestId('load-earlier-sessions')).not.toBeInTheDocument()
  })

  it('shows mic icon when hasVoiceNote is true', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, hasVoiceNote: true }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('voice-note-icon')).toBeInTheDocument()
  })

  it('does not show mic icon when hasVoiceNote is false', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([SESSION_BASE])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.queryByTestId('voice-note-icon')).not.toBeInTheDocument()
  })

  it('shows duration badge when duration is set', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([{ ...SESSION_BASE, duration: 60 }])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByTestId('duration-badge')).toHaveTextContent('60 min')
  })

  it('shows session title when title is set', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, title: 'Subjunctive Usage in Time Clauses' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText('Subjunctive Usage in Time Clauses')).toBeInTheDocument()
  })

  it('falls back to Session date format when no title', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SESSION_BASE, title: null, sessionDate: '2026-04-05T10:00:00Z' },
    ])
    wrapper()
    await screen.findByTestId('session-entry')
    expect(screen.getByText(/Session, Apr 5/)).toBeInTheDocument()
  })
})
