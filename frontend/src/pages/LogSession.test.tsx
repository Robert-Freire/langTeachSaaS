import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LogSession from './LogSession'
import * as studentsApi from '@/api/students'
import * as sessionLogsApi from '@/api/sessionLogs'
import * as followupsApi from '@/api/followups'
import * as lessonsApi from '@/api/lessons'
import type { Student, TeachingTodo } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/students', () => ({
  getStudent: vi.fn(),
  appendTeachingTodo: vi.fn().mockResolvedValue({}),
  updateTeachingTodo: vi.fn().mockResolvedValue({}),
  deleteTeachingTodo: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/api/sessionLogs', () => ({
  getSession: vi.fn(),
  listSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  parseTopicTags: vi.fn((raw: string) => {
    try { return JSON.parse(raw) as unknown[] } catch { return [] }
  }),
  serializeTopicTags: vi.fn((tags: unknown[]) => JSON.stringify(tags)),
}))

vi.mock('@/api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn().mockResolvedValue({}),
  updateFollowupStatus: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/api/lessons', () => ({
  getLessons: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}))

vi.mock('@/components/session/TopicTagsInput', () => ({
  TopicTagsInput: ({ onChange }: { onChange: (tags: []) => void }) => (
    <div data-testid="topic-tags-input" onClick={() => onChange([])} />
  ),
}))

vi.mock('@/components/audio/AudioRecorder', () => ({
  AudioRecorder: () => <div data-testid="audio-recorder" />,
}))

const STUDENT_ID = 'student-abc'

const SAMPLE_STUDENT: Student = {
  id: STUDENT_ID,
  name: 'Ana Seed',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: ['reading'],
  personalNotes: null,
  teachingNotes: null,
  nativeLanguages: ['Portuguese'],
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: null,
  profession: null,
  countryOfOrigin: null,
  cityOfOrigin: null,
  countryOfResidence: null,
  cityOfResidence: null,
  reasonForStudying: null,
  officialCefrLevel: null,
  shortTermObjectives: [],
  isActive: true,
  isCorporate: false,
  rate: null,
  spokenLanguages: [],
  teachingTodos: [],
  skillLevelOverrides: {},
}

const SAMPLE_SESSION: SessionLog = {
  id: 'session-1',
  studentId: STUDENT_ID,
  sessionDate: '2026-03-01T00:00:00Z',
  plannedContent: null,
  actualContent: 'Covered ser vs estar',
  homeworkAssigned: 'Page 42',
  previousHomeworkStatus: 1,
  previousHomeworkStatusName: 'Done',
  nextSessionTopics: 'Review homework',
  generalNotes: null,
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
  topicTags: '[]',
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
  isCancelled: false,
  status: 1,
  statusName: 'Confirmed',
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  duration: 60,
  title: null,
  hasVoiceNote: false,
}

function renderLogSession() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${STUDENT_ID}/log-session`]}>
        <Routes>
          <Route path="/students/:id/log-session" element={<LogSession />} />
          <Route path="/students/:id" element={<div data-testid="student-detail">Student Detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LogSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(studentsApi.getStudent).mockResolvedValue(SAMPLE_STUDENT)
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('renders left panel with student name and CEFR badge', async () => {
    renderLogSession()
    await screen.findByTestId('student-name')
    expect(screen.getByTestId('student-name')).toHaveTextContent('Ana Seed')
    expect(screen.getByTestId('cefr-badge')).toHaveTextContent('B1')
  })

  it('renders session number as 1 when no sessions exist', async () => {
    renderLogSession()
    await screen.findByTestId('session-number')
    expect(screen.getByTestId('session-number')).toHaveTextContent('Session #1')
  })

  it('computes session number excluding cancelled sessions', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, id: 's1', isCancelled: false },
      { ...SAMPLE_SESSION, id: 's2', isCancelled: true },
      { ...SAMPLE_SESSION, id: 's3', isCancelled: false },
    ])
    renderLogSession()
    await screen.findByTestId('session-number')
    // 2 non-cancelled + 1 = session #3
    expect(screen.getByTestId('session-number')).toHaveTextContent('Session #3')
  })

  it('date defaults to today', async () => {
    renderLogSession()
    await screen.findByTestId('session-date')
    const today = new Date().toISOString().split('T')[0]
    expect(screen.getByTestId('session-date')).toHaveValue(today)
  })

  it('duration defaults to 60', async () => {
    renderLogSession()
    await screen.findByTestId('duration-select')
    expect(screen.getByTestId('duration-select')).toHaveTextContent(/60/)
  })

  it('reveals custom duration input when "Other" selected', async () => {
    const user = userEvent.setup()
    renderLogSession()
    await screen.findByTestId('duration-select')
    expect(screen.queryByTestId('duration-other')).toBeNull()
    await user.click(screen.getByTestId('duration-select'))
    const option = await screen.findByRole('option', { name: 'Other' })
    await user.click(option)
    expect(screen.getByTestId('duration-other')).toBeDefined()
  })

  it('pre-populates What Happened from prev session nextSessionTopics', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, nextSessionTopics: 'Review irregular verbs' },
    ])
    renderLogSession()
    await screen.findByTestId('actual-content')
    expect(screen.getByTestId('actual-content')).toHaveValue('Review irregular verbs')
  })

  it('shows planned-for-today reference panel when prev session has nextSessionTopics', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, nextSessionTopics: 'Subjunctive revision' },
    ])
    renderLogSession()
    await screen.findByTestId('log-session-left-panel')
    expect(screen.getAllByText('Subjunctive revision').length).toBeGreaterThan(0)
  })

  it('shows teaching todos as checkboxes', async () => {
    const todo: TeachingTodo = {
      id: 'todo-1', text: 'Check homework', status: 'Pending',
      createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null,
    }
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      teachingTodos: [todo],
    })
    renderLogSession()
    await screen.findByTestId('teaching-todo-item')
    expect(screen.getByText('Check homework')).toBeDefined()
    const cb = screen.getByTestId('teaching-todo-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(false)
    fireEvent.click(cb)
    expect(cb.checked).toBe(true)
  })

  it('hides form fields when cancelled toggle is clicked', async () => {
    renderLogSession()
    await screen.findByTestId('cancelled-toggle')
    expect(screen.getByTestId('actual-content')).toBeDefined()
    fireEvent.click(screen.getByTestId('cancelled-toggle'))
    await waitFor(() => {
      expect(screen.queryByTestId('actual-content')).toBeNull()
    })
  })

  it('calls createSession with correct payload when Done is clicked after typing', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Great session' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(sessionLogsApi.createSession).toHaveBeenCalledWith(
        STUDENT_ID,
        expect.objectContaining({
          actualContent: 'Great session',
          isCancelled: false,
          status: 'Confirmed',
          duration: 60,
        }),
      )
    })
  })

  it('navigates back to student detail when Done is clicked', async () => {
    renderLogSession()
    await screen.findByTestId('done-btn')
    // No changes made - Done should navigate without saving
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}`)
    })
  })

  it('back-button navigates back to student detail when no changes', async () => {
    renderLogSession()
    await screen.findByTestId('back-button')
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}`)
  })

  it('shows autosave status indicator', async () => {
    renderLogSession()
    await screen.findByTestId('autosave-status')
    // Initially idle - no text shown
    expect(screen.getByTestId('autosave-status')).toBeDefined()
  })

  it('adds new todo to list on Enter key', async () => {
    renderLogSession()
    await screen.findByTestId('new-todo-input')
    fireEvent.change(screen.getByTestId('new-todo-input'), { target: { value: 'Check pronunciation' } })
    fireEvent.keyDown(screen.getByTestId('new-todo-input'), { key: 'Enter' })
    expect(screen.getByText('Check pronunciation')).toBeDefined()
    expect(screen.queryByDisplayValue('Check pronunciation')).toBeNull()
  })

  it('calls updateTeachingTodo for checked todos on Done', async () => {
    const todo: TeachingTodo = {
      id: 'todo-1', text: 'Review grammar', status: 'Pending',
      createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null,
    }
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...SAMPLE_STUDENT, teachingTodos: [todo] })
    renderLogSession()
    await screen.findByTestId('teaching-todo-checkbox')
    fireEvent.click(screen.getByTestId('teaching-todo-checkbox'))
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Session content' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(studentsApi.updateTeachingTodo).toHaveBeenCalledWith(
        STUDENT_ID, 'todo-1',
        expect.objectContaining({ status: 'Covered', coveredInSessionLogId: 'new-session' }),
      )
    })
  })

  it('calls appendTeachingTodo for new todo added via quick-add on Done', async () => {
    renderLogSession()
    await screen.findByTestId('new-todo-input')
    fireEvent.change(screen.getByTestId('new-todo-input'), { target: { value: 'Practice pronunciation' } })
    fireEvent.keyDown(screen.getByTestId('new-todo-input'), { key: 'Enter' })
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Session content' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(studentsApi.appendTeachingTodo).toHaveBeenCalledWith(STUDENT_ID, 'Practice pronunciation')
    })
  })

  it('calls createFollowup for new followup added via quick-add on Done', async () => {
    renderLogSession()
    await screen.findByTestId('new-followup-input')
    fireEvent.change(screen.getByTestId('new-followup-input'), { target: { value: 'Send workbook PDF' } })
    fireEvent.keyDown(screen.getByTestId('new-followup-input'), { key: 'Enter' })
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Session content' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(followupsApi.createFollowup).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Send workbook PDF', studentId: STUDENT_ID })
      )
    })
  })

  it('pending followups shown as checkboxes in left panel', async () => {
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([
      {
        id: 'f-1', text: 'Send grammar sheet', status: 'pending',
        studentId: STUDENT_ID, studentName: 'Ana Seed', dueDate: null,
        createdAt: '2026-01-01T00:00:00Z', completedAt: null, sourceSessionLogId: null,
      },
    ])
    renderLogSession()
    await screen.findByTestId('followup-item')
    expect(screen.getByText('Send grammar sheet')).toBeDefined()
    const cb = screen.getByTestId('followup-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(false)
    fireEvent.click(cb)
    expect(cb.checked).toBe(true)
  })

  it('shows previousHomeworkStatus buttons when prev session had homework', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, homeworkAssigned: 'Page 42' },
    ])
    renderLogSession()
    await screen.findByTestId('prev-homework-status')
    expect(screen.getByTestId('prev-hw-done')).toBeDefined()
    expect(screen.getByTestId('prev-hw-partial')).toBeDefined()
    expect(screen.getByTestId('prev-hw-notdone')).toBeDefined()
  })

  it('shows Topics Covered without opening secondary section', async () => {
    renderLogSession()
    await screen.findByTestId('topics-covered-section')
    expect(screen.queryByTestId('toggle-secondary')).toBeInTheDocument()
    // Topics Covered is visible without clicking toggle-secondary
    expect(screen.getByTestId('topics-covered-section')).toBeDefined()
    expect(screen.getByTestId('topic-tags-input')).toBeDefined()
  })

  it('shows suggestion chips when narrative contains a known keyword', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), {
      target: { value: 'Revisamos el subjuntivo en oraciones temporales' },
    })
    await waitFor(() => {
      expect(screen.getByTestId('topic-tag-suggestions')).toBeDefined()
      expect(screen.getByTestId('tag-suggestion-subjuntivo')).toBeDefined()
    })
  })

  it('does not show suggestion chips when narrative has no matching keywords', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), {
      target: { value: 'Hicimos ejercicios generales' },
    })
    await waitFor(() => {
      expect(screen.queryByTestId('topic-tag-suggestions')).toBeNull()
    })
  })
})

const SESSION_ID = 'session-edit-1'

const EDIT_SESSION: SessionLog = {
  ...SAMPLE_SESSION,
  id: SESSION_ID,
  actualContent: 'Covered irregular preterite',
  homeworkAssigned: 'Exercises p. 55',
  nextSessionTopics: 'Imperfect tense',
  sessionDate: '2026-04-01T00:00:00Z',
  duration: 45,
  previousHomeworkStatusName: 'Done',
  isCancelled: false,
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
}

function renderEditSession() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${STUDENT_ID}/sessions/${SESSION_ID}/edit`]}>
        <Routes>
          <Route path="/students/:id/sessions/:sessionId/edit" element={<LogSession />} />
          <Route path="/students/:id" element={<div data-testid="student-detail">Student Detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LogSession — edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(studentsApi.getStudent).mockResolvedValue(SAMPLE_STUDENT)
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([EDIT_SESSION])
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue(EDIT_SESSION)
    vi.mocked(sessionLogsApi.updateSession).mockResolvedValue(EDIT_SESSION)
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({ ...EDIT_SESSION, id: 'new-session' })
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('shows "Edit Session" heading in edit mode', async () => {
    renderEditSession()
    await screen.findByTestId('page-heading')
    expect(screen.getByTestId('page-heading')).toHaveTextContent('Edit Session')
  })

  it('pre-populates actual content from fetched session', async () => {
    renderEditSession()
    await screen.findByTestId('actual-content')
    expect(screen.getByTestId('actual-content')).toHaveValue('Covered irregular preterite')
  })

  it('does not clobber actual content with plannedForToday in edit mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...EDIT_SESSION, id: 'other-session', nextSessionTopics: 'Should not appear' },
      EDIT_SESSION,
    ])
    renderEditSession()
    await screen.findByTestId('actual-content')
    expect(screen.getByTestId('actual-content')).toHaveValue('Covered irregular preterite')
  })

  it('calls updateSession (not createSession) when changes are made in edit mode', async () => {
    renderEditSession()
    await screen.findByTestId('actual-content')
    // Make a change to trigger hasChanges
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Updated content' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(sessionLogsApi.updateSession).toHaveBeenCalledWith(
        STUDENT_ID,
        SESSION_ID,
        expect.objectContaining({ actualContent: 'Updated content' }),
      )
      expect(sessionLogsApi.createSession).not.toHaveBeenCalled()
    })
  })

  it('renders suggested difficulty chip and allows dismissal', async () => {
    const sessionWithDiff: SessionLog = {
      ...EDIT_SESSION,
      suggestedDifficulties: JSON.stringify([{
        description: 'Confuses ser/estar',
        competency: 'Grammar',
        subcategory: 'Ser/Estar',
        severity: 'Medium',
      }]),
    }
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue(sessionWithDiff)
    renderEditSession()
    const chip = await screen.findByTestId('suggested-difficulty-chip')
    expect(chip).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('remove-suggested-difficulty'))
    await waitFor(() => {
      expect(screen.queryByTestId('suggested-difficulty-chip')).not.toBeInTheDocument()
    })
  })

  it('back arrow in edit mode navigates away without discard confirmation when no changes', async () => {
    renderEditSession()
    await screen.findByTestId('back-button')
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}?tab=sessions`)
    expect(screen.queryByTestId('discard-confirm-bar')).not.toBeInTheDocument()
  })

  it('Done in edit mode navigates to ?tab=sessions', async () => {
    renderEditSession()
    await screen.findByTestId('done-btn')
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}?tab=sessions`)
    })
  })

  it('shows "Last saved" in edit mode when idle', async () => {
    const sessionWithTimestamp: SessionLog = {
      ...EDIT_SESSION,
      updatedAt: '2026-04-01T10:30:00Z',
    }
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue(sessionWithTimestamp)
    renderEditSession()
    await screen.findByTestId('autosave-status')
    await waitFor(() => {
      expect(screen.getByTestId('autosave-status')).toHaveTextContent(/Last saved/)
    })
  })
})

describe('LogSession — back arrow behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    vi.mocked(studentsApi.getStudent).mockResolvedValue(SAMPLE_STUDENT)
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('back arrow navigates away immediately when no changes made', async () => {
    renderLogSession()
    await screen.findByTestId('back-button')
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}`)
  })

  it('back arrow shows discard confirmation when changes exist', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content' } })
    fireEvent.click(screen.getByTestId('back-button'))
    expect(screen.getByTestId('discard-confirm-bar')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('discard button navigates away without saving', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content' } })
    fireEvent.click(screen.getByTestId('back-button'))
    fireEvent.click(screen.getByTestId('discard-btn'))
    expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}`)
  })

  it('keep editing button hides the discard bar', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content' } })
    fireEvent.click(screen.getByTestId('back-button'))
    fireEvent.click(screen.getByTestId('keep-editing-btn'))
    expect(screen.queryByTestId('discard-confirm-bar')).not.toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('LogSession — Ctrl+Enter shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    vi.mocked(studentsApi.getStudent).mockResolvedValue(SAMPLE_STUDENT)
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
    })
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('Ctrl+Enter triggers Done (navigates away)', async () => {
    renderLogSession()
    await screen.findByTestId('log-session-page')
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}`)
    })
  })
})
