import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  extractSessionReflection: vi.fn(),
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

let capturedOnVoiceNote: ((note: { id: string; transcription: string | null }) => void) | null = null

vi.mock('@/components/audio/AudioRecorder', () => ({
  AudioRecorder: ({ onVoiceNote }: { onVoiceNote: (note: { id: string; transcription: string | null }) => void }) => {
    capturedOnVoiceNote = onVoiceNote
    return <div data-testid="audio-recorder" />
  },
}))

const STUDENT_ID = 'student-abc'

const SAMPLE_STUDENT: Student = {
  id: STUDENT_ID,
  name: 'Ana Seed',
  learningLanguage: 'Spanish',
  level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
  languages: { nativeLanguages: ['Portuguese'], spokenLanguages: [] },
  identity: {
    birthYear: null, age: null, profession: null,
    countryOfOrigin: null, cityOfOrigin: null,
    countryOfResidence: null, cityOfResidence: null,
  },
  profile: {
    interests: ['reading'], personalNotes: null, teachingNotes: null,
    learningGoals: [], weaknesses: [], difficulties: [],
    shortTermObjectives: [], teachingTodos: [], reasonForStudying: null,
  },
  commercial: { isActive: true, isCorporate: false, rate: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
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

  it('duration defaults to 50', async () => {
    renderLogSession()
    await screen.findByTestId('duration-select')
    expect(screen.getByTestId('duration-select')).toHaveTextContent(/50/)
  })

  it('duration dropdown includes 25 and 50 min options', async () => {
    const user = userEvent.setup()
    renderLogSession()
    await screen.findByTestId('duration-select')
    await user.click(screen.getByTestId('duration-select'))
    expect(await screen.findByRole('option', { name: '25 min' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '50 min' })).toBeInTheDocument()
  })

  it('duration "Other" option includes unit context label "Other (min)"', async () => {
    const user = userEvent.setup()
    renderLogSession()
    await screen.findByTestId('duration-select')
    await user.click(screen.getByTestId('duration-select'))
    expect(await screen.findByRole('option', { name: 'Other (min)' })).toBeInTheDocument()
  })

  it('reveals custom duration input when "Other (min)" selected', async () => {
    const user = userEvent.setup()
    renderLogSession()
    await screen.findByTestId('duration-select')
    expect(screen.queryByTestId('duration-other')).toBeNull()
    await user.click(screen.getByTestId('duration-select'))
    const option = await screen.findByRole('option', { name: 'Other (min)' })
    await user.click(option)
    expect(screen.getByTestId('duration-other')).toBeDefined()
  })


  it('pre-populates actualContent from plannedForToday in create mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, nextSessionTopics: 'Subjunctive revision' },
    ])
    renderLogSession()
    await screen.findByTestId('actual-content')
    await waitFor(() => {
      expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Subjunctive revision')
    })
  })

  it('does not re-pre-populate actualContent after user edits it (pre-populate runs only once)', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, nextSessionTopics: 'Subjunctive revision' },
    ])
    renderLogSession()
    await screen.findByTestId('actual-content')
    await waitFor(() => {
      expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Subjunctive revision')
    })
    // User clears the field and writes their own notes
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'My own notes' } })
    // The pre-populate effect must not fire again and reset the field
    await waitFor(() => {
      expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('My own notes')
    })
  })

  it('shows planned-for-today reference panel when prev session has nextSessionTopics', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, nextSessionTopics: 'Subjunctive revision' },
    ])
    renderLogSession()
    await screen.findByTestId('log-session-left-panel')
    expect(screen.getAllByText('Subjunctive revision').length).toBeGreaterThan(0)
  })

  it('shows teaching todos with DS §11.4 indigo square toggle', async () => {
    const todo: TeachingTodo = {
      id: 'todo-1', text: 'Check homework', status: 'Pending',
      createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null,
    }
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: { ...SAMPLE_STUDENT.profile, teachingTodos: [todo] },
    })
    renderLogSession()
    await screen.findByTestId('teaching-todo-item')
    expect(screen.getByText('Check homework')).toBeDefined()
    const btn = screen.getByTestId('teaching-todo-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('teaching todo toggle can be toggled off (round-trip)', async () => {
    const todo: TeachingTodo = {
      id: 'todo-1', text: 'Check homework', status: 'Pending',
      createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null,
    }
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: { ...SAMPLE_STUDENT.profile, teachingTodos: [todo] },
    })
    renderLogSession()
    const btn = await screen.findByTestId('teaching-todo-toggle')
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows Cancelled toggle aligned with Date/Time/Duration cells (spacer present)', async () => {
    renderLogSession()
    await screen.findByTestId('cancelled-toggle')
    // The Cancelled toggle cell uses an invisible spacer so its toggle row aligns
    // with the input rows in the Date, Time, and Duration cells.
    // Design-system 11.3: Cancelled toggle must NOT be under a "Status" heading.
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
    expect(screen.getByTestId('cancelled-toggle')).toBeInTheDocument()
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

  it('shows amber callout message when cancelled toggle is clicked', async () => {
    renderLogSession()
    await screen.findByTestId('cancelled-toggle')
    fireEvent.click(screen.getByTestId('cancelled-toggle'))
    await waitFor(() => {
      expect(screen.getByText(/This session was cancelled/)).toBeInTheDocument()
    })
    const callout = screen.getByText(/This session was cancelled/).closest('div')
    expect(callout?.className).toContain('bg-amber-50')
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
          duration: 50,
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
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...SAMPLE_STUDENT, profile: { ...SAMPLE_STUDENT.profile, teachingTodos: [todo] } })
    renderLogSession()
    await screen.findByTestId('teaching-todo-toggle')
    fireEvent.click(screen.getByTestId('teaching-todo-toggle'))
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

  it('pending followups shown with DS §11.4 amber circle toggle in left panel', async () => {
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
    const btn = screen.getByTestId('followup-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('followup toggle can be toggled off (round-trip)', async () => {
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([
      {
        id: 'f-1', text: 'Send grammar sheet', status: 'pending',
        studentId: STUDENT_ID, studentName: 'Ana Seed', dueDate: null,
        createdAt: '2026-01-01T00:00:00Z', completedAt: null, sourceSessionLogId: null,
      },
    ])
    renderLogSession()
    const btn = await screen.findByTestId('followup-toggle')
    expect(btn.tagName).toBe('BUTTON')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('student difficulty uses DS §11.4 amber circle toggle and can be toggled off', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: {
        ...SAMPLE_STUDENT.profile,
        difficulties: [{
          id: 'd-1', description: 'Ser vs estar', competency: 'Grammar',
          subcategory: 'Verbs', severity: 'high', trend: 'stable', status: 'Active',
        }],
      },
    })
    renderLogSession()
    const btn = await screen.findByTestId('difficulty-toggle')
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
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

  it('shows audio recorder without opening secondary section', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    expect(screen.getByTestId('audio-recorder')).toBeDefined()
    // audio recorder should be visible without toggling secondary
    expect(screen.getByTestId('voice-recorder-section')).toBeDefined()
  })

  it('toggle button shows descriptor text when closed and changes on open', async () => {
    renderLogSession()
    const toggle = await screen.findByTestId('toggle-secondary')
    expect(toggle).toHaveTextContent('Show notes, lesson link, level reassessment...')
    fireEvent.click(toggle)
    await waitFor(() => {
      expect(screen.getByTestId('toggle-secondary')).toHaveTextContent('Hide additional sections')
    })
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

  it('C5: topic tag suggestion chips have no border-indigo class', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), {
      target: { value: 'Revisamos el subjuntivo en oraciones temporales' },
    })
    await waitFor(() => {
      const chip = screen.getByTestId('tag-suggestion-subjuntivo')
      expect(chip.className).not.toContain('border-indigo')
      expect(chip.className).toContain('bg-indigo-100')
    })
  })

  describe('voice extraction highlight + undo bar', () => {
    const MOCK_EXTRACTION = {
      rawExtractionJson: '{}',
      sessionTitle: 'Great session',
      whatWasCovered: { value: 'Practiced subjunctive', mode: 'replace' as const },
      homeworkAssigned: { value: 'Page 10', mode: 'replace' as const },
      nextLessonIdeas: { value: 'Review ser/estar', mode: 'replace' as const },
      areasToImprove: null,
      emotionalSignals: null,
      topicTags: [],
      suggestedDifficulties: [],
      sessionDate: null,
      sessionStartTime: null,
      durationMinutes: null,
    }

    beforeEach(() => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue(MOCK_EXTRACTION)
      vi.mocked(sessionLogsApi.createSession).mockResolvedValue({ ...SAMPLE_SESSION, id: 'new-session' })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function triggerExtraction() {
      renderLogSession()
      await screen.findByTestId('audio-recorder')
      await act(async () => {
        capturedOnVoiceNote?.({ id: 'note-1', transcription: 'Great session today' })
        await Promise.resolve()
      })
    }

    it('shows undo bar after extraction with correct field count', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('undo-extraction-bar')).toBeInTheDocument()
      })
      expect(screen.getByTestId('undo-extraction-bar')).toHaveTextContent('fields filled from recording')
    })

    it('undo bar auto-dismisses after 8 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('undo-extraction-bar')).toBeInTheDocument()
      })
      act(() => { vi.advanceTimersByTime(8001) })
      expect(screen.queryByTestId('undo-extraction-bar')).not.toBeInTheDocument()
    })

    it('X button dismisses bar without reverting fields', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content')).toHaveValue('Practiced subjunctive')
      })
      fireEvent.click(screen.getByTestId('dismiss-undo-bar'))
      expect(screen.queryByTestId('undo-extraction-bar')).not.toBeInTheDocument()
      expect(screen.getByTestId('actual-content')).toHaveValue('Practiced subjunctive')
    })

    it('Undo extraction reverts extracted fields to pre-extraction values', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content')).toHaveValue('Practiced subjunctive')
      })
      fireEvent.click(screen.getByTestId('undo-extraction-btn'))
      expect(screen.queryByTestId('undo-extraction-bar')).not.toBeInTheDocument()
      expect(screen.getByTestId('actual-content')).toHaveValue('')
    })

    it('field manually edited after extraction is NOT reverted on undo', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content')).toHaveValue('Practiced subjunctive')
      })
      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'My own content' } })
      fireEvent.click(screen.getByTestId('undo-extraction-btn'))
      expect(screen.queryByTestId('undo-extraction-bar')).not.toBeInTheDocument()
      expect(screen.getByTestId('actual-content')).toHaveValue('My own content')
    })

    it('highlight ring is applied to all changed fields after extraction', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content').className).toContain('ring-indigo-500/40')
      })
      expect(screen.getByTestId('homework-assigned').className).toContain('ring-indigo-500/40')
      expect(screen.getByTestId('next-session-topics').className).toContain('ring-indigo-500/40')
      expect(screen.getByTestId('log-session-title-input').className).toContain('ring-indigo-500/40')
    })

    it('unchanged fields do not receive highlight ring after extraction', async () => {
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content').className).toContain('ring-indigo-500/40')
      })
      expect(screen.getByTestId('session-date').className).not.toContain('ring-indigo-500/40')
      expect(screen.getByTestId('session-time').className).not.toContain('ring-indigo-500/40')
    })

    it('highlight ring clears after 2 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      await triggerExtraction()
      await waitFor(() => {
        expect(screen.getByTestId('actual-content').className).toContain('ring-indigo-500/40')
      })
      act(() => { vi.advanceTimersByTime(2001) })
      expect(screen.getByTestId('actual-content').className).not.toContain('ring-indigo-500/40')
    })

    it('undo bar does not appear when extraction produces no field changes', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        rawExtractionJson: '{}',
        sessionTitle: null,
        whatWasCovered: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        areasToImprove: null,
        emotionalSignals: null,
        topicTags: [],
        suggestedDifficulties: [],
        sessionDate: null,
        sessionStartTime: null,
        durationMinutes: null,
      })
      renderLogSession()
      await screen.findByTestId('audio-recorder')
      await act(async () => {
        capturedOnVoiceNote?.({ id: 'note-1', transcription: 'Something quiet' })
        await Promise.resolve()
      })
      expect(screen.queryByTestId('undo-extraction-bar')).not.toBeInTheDocument()
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

  it.each([25, 50])('pre-selects duration %i in edit mode', async (dur) => {
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue({ ...EDIT_SESSION, duration: dur })
    renderEditSession()
    await screen.findByTestId('duration-select')
    expect(screen.getByTestId('duration-select')).toHaveTextContent(String(dur))
  })

  it('shows Other with empty input when session has null duration', async () => {
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue({ ...EDIT_SESSION, duration: null })
    renderEditSession()
    await screen.findByTestId('duration-select')
    expect(screen.getByTestId('duration-select')).toHaveTextContent(/other/i)
    expect(screen.getByTestId('duration-other')).toHaveValue(null)
  })

  it('pre-fills time from sessionDate in edit mode', async () => {
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue({
      ...EDIT_SESSION,
      sessionDate: '2026-04-01T14:30:00Z',
    })
    renderEditSession()
    await screen.findByTestId('session-time')
    expect((screen.getByTestId('session-time') as HTMLInputElement).value).toBe('14:30')
  })

  it('includes time in autosave payload when Done is clicked in edit mode', async () => {
    vi.mocked(sessionLogsApi.getSession).mockResolvedValue({
      ...EDIT_SESSION,
      sessionDate: '2026-04-01T09:00:00Z',
    })
    renderEditSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Updated' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('done-btn'))
    })
    await waitFor(() => {
      expect(sessionLogsApi.updateSession).toHaveBeenCalledWith(
        STUDENT_ID,
        SESSION_ID,
        expect.objectContaining({
          sessionDate: expect.stringContaining('T09:00'),
        }),
      )
    })
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

  it('back arrow in edit mode navigates without showing the discard banner even when there are unsaved changes', async () => {
    renderEditSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Just typed something' } })
    await act(async () => { fireEvent.click(screen.getByTestId('back-button')) })
    expect(screen.queryByTestId('discard-confirm-bar')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/students/${STUDENT_ID}?tab=sessions`)
    })
  })

  it('back arrow in edit mode flushes pending autosave before navigating (text within debounce window persists)', async () => {
    renderEditSession()
    await screen.findByTestId('actual-content')
    // Simulate typing quickly: change fires scheduleTextSave but we do not advance timers past the debounce.
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Typed right before back' } })
    await act(async () => { fireEvent.click(screen.getByTestId('back-button')) })
    // saveNow should have been called with the typed text, regardless of debounce not firing
    await waitFor(() => {
      expect(sessionLogsApi.updateSession).toHaveBeenCalledWith(
        STUDENT_ID,
        SESSION_ID,
        expect.objectContaining({ actualContent: 'Typed right before back' }),
      )
    })
  })

  it('back arrow in edit mode does NOT navigate when the flush save fails', async () => {
    // Persistent rejection so the mutation exhausts its retries and reports error
    vi.mocked(sessionLogsApi.updateSession).mockRejectedValue(new Error('boom'))
    renderEditSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Will fail to save' } })
    await act(async () => { fireEvent.click(screen.getByTestId('back-button')) })
    // Error message surfaced (matches handleDone's error UI) — the mutation retries,
    // so this waits out the retry window before asserting.
    await waitFor(() => {
      expect(screen.getByText(/Failed to save session/i)).toBeInTheDocument()
    }, { timeout: 15000 })
    // And we did NOT navigate — user's last edits would otherwise appear lost
    expect(mockNavigate).not.toHaveBeenCalledWith(`/students/${STUDENT_ID}?tab=sessions`)
  }, 20000)

  it('form state does not reset when the session cache is updated in place (same id)', async () => {
    // Mount with original session; user types new content; then an autosave-style
    // cache update writes a fresh SessionLog into the SAME QueryClient for the
    // SAME session id. The initializedForIdRef guard must prevent the populate
    // effect from running a second time and wiping the in-progress edit.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/students/${STUDENT_ID}/sessions/${SESSION_ID}/edit`]}>
          <Routes>
            <Route path="/students/:id/sessions/:sessionId/edit" element={<LogSession />} />
            <Route path="/students/:id" element={<div data-testid="student-detail">Student Detail</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'User is typing' } })
    // Simulate the autosave onSuccess cache update on the same QueryClient.
    // Keys must match those used by the page: ['session', studentId, sessionId].
    await act(async () => {
      client.setQueryData(['session', STUDENT_ID, SESSION_ID], {
        ...EDIT_SESSION,
        actualContent: 'Server echoed the saved value',
        updatedAt: '2026-04-01T12:00:00Z',
      })
    })
    // The effect is keyed off editSession.id (same id here), so it must not re-run
    // and the user's in-progress text must remain intact.
    await waitFor(() => {
      expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('User is typing')
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

  it('C6: discard button has no red border class', async () => {
    renderLogSession()
    await screen.findByTestId('actual-content')
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content' } })
    fireEvent.click(screen.getByTestId('back-button'))
    const btn = screen.getByTestId('discard-btn')
    expect(btn.className).not.toContain('border-red')
  })
})

describe('LogSession — left panel context + metadata polish', () => {
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

  it('shows "First session" empty state when no prior sessions in create mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    renderLogSession()
    await screen.findByTestId('first-session-empty')
    expect(screen.getByText('First session!')).toBeInTheDocument()
  })

  it('shows last session card with duration when prior sessions exist', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      { ...SAMPLE_SESSION, actualContent: 'Covered ser vs estar', duration: 45 },
    ])
    renderLogSession()
    await screen.findByTestId('log-session-left-panel')
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText(/Covered ser vs estar/)).toBeInTheDocument()
  })

  it('shows skill level overrides when available', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      level: { ...SAMPLE_STUDENT.level, skillLevelOverrides: { Speaking: 'B1', Writing: 'A2' } },
    })
    renderLogSession()
    await screen.findByTestId('skill-levels-row')
    expect(screen.getByTestId('skill-levels-row')).toHaveTextContent('Speaking B1')
    expect(screen.getByTestId('skill-levels-row')).toHaveTextContent('Writing A2')
  })

  it('hides skill level row when no overrides', async () => {
    renderLogSession()
    await screen.findByTestId('session-number')
    expect(screen.queryByTestId('skill-levels-row')).not.toBeInTheDocument()
  })

  it('shows working memory card when teachingNotes available', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: { ...SAMPLE_STUDENT.profile, teachingNotes: 'Prefers visual examples. Struggles with subjunctive.' },
    })
    renderLogSession()
    await screen.findByTestId('working-memory-card')
    expect(screen.getByText(/Prefers visual examples/)).toBeInTheDocument()
  })

  it('hides working memory card when teachingNotes is null', async () => {
    renderLogSession()
    await screen.findByTestId('log-session-left-panel')
    expect(screen.queryByTestId('working-memory-card')).not.toBeInTheDocument()
  })

  it('shows expand toggle for long difficulty descriptions', async () => {
    const longDesc = 'A'.repeat(100)
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: { ...SAMPLE_STUDENT.profile, difficulties: [{
        id: 'd1', description: longDesc, competency: 'Grammar',
        subcategory: 'Verbs', severity: 'high', trend: 'stable', status: 'Active',
      }] },
    })
    renderLogSession()
    await screen.findByTestId('difficulty-item')
    expect(screen.getByTestId('difficulty-expand-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-expand-toggle')).toHaveTextContent('more')
  })

  it('does not show expand toggle for short difficulty descriptions', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...SAMPLE_STUDENT,
      profile: { ...SAMPLE_STUDENT.profile, difficulties: [{
        id: 'd2', description: 'Short text', competency: 'Grammar',
        subcategory: 'Articles', severity: 'low', trend: 'stable', status: 'Active',
      }] },
    })
    renderLogSession()
    await screen.findByTestId('difficulty-item')
    expect(screen.queryByTestId('difficulty-expand-toggle')).not.toBeInTheDocument()
  })

  it('renders time input defaulting to current time', async () => {
    renderLogSession()
    await screen.findByTestId('session-time')
    const timeInput = screen.getByTestId('session-time') as HTMLInputElement
    expect(timeInput.value).toMatch(/^\d{2}:\d{2}$/)
  })

  it('metadata bar has 2x2 grid layout with date, time, duration, and status', async () => {
    renderLogSession()
    await screen.findByTestId('session-date')
    expect(screen.getByTestId('session-date')).toBeInTheDocument()
    expect(screen.getByTestId('session-time')).toBeInTheDocument()
    expect(screen.getByTestId('duration-select')).toBeInTheDocument()
    expect(screen.getByTestId('cancelled-toggle')).toBeInTheDocument()
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

describe('LogSession — voice note extraction', () => {
  const EXTRACTED = {
    sessionTitle: 'Pretérito perfecto y viajes',
    whatWasCovered: { value: 'Repasamos el pretérito perfecto.', mode: 'replace' as const },
    areasToImprove: null,
    emotionalSignals: null,
    homeworkAssigned: null,
    nextLessonIdeas: null,
    suggestedDifficulties: [],
    topicTags: [{ tag: 'pretérito perfecto' }, { tag: 'vocabulario de viajes' }],
    rawExtractionJson: '{"sessionTitle":"Pretérito perfecto y viajes"}',
    durationMinutes: null,
    isCancelled: null,
    previousHomeworkStatus: null,
    teachingTodos: [],
    teacherFollowups: [],
    levelReassessment: null,
    difficultiesWorkedOn: [],
  }

  beforeEach(() => {
    capturedOnVoiceNote = null
    vi.clearAllMocks()
    vi.mocked(studentsApi.getStudent).mockResolvedValue(SAMPLE_STUDENT)
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({ ...SAMPLE_SESSION, id: 'new-session' })
    vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({ ...SAMPLE_SESSION, id: 'new-session' })
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
  })

  it('shows loading indicator while extraction is in progress', async () => {
    let resolveExtract!: () => void
    vi.mocked(sessionLogsApi.extractSessionReflection).mockReturnValue(
      new Promise(resolve => { resolveExtract = () => resolve(EXTRACTED) })
    )
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La sesión fue bien.' })
    })

    expect(screen.getByTestId('extracting-indicator')).toBeDefined()

    await act(async () => { resolveExtract() })
    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })
  })

  it('populates actualContent and topicTags from extraction response', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue(EXTRACTED)
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La sesión fue bien.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    const contentField = screen.getByTestId('actual-content') as HTMLTextAreaElement
    expect(contentField.value).toBe('Repasamos el pretérito perfecto.')
  })

  it('includes voiceNoteTranscription and rawExtractionJson in the save payload', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue(EXTRACTED)
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La sesión fue bien.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    // Autosave triggers createSession; verify voice note fields are in the payload
    await waitFor(() => {
      expect(sessionLogsApi.createSession).toHaveBeenCalled()
    })
    const calls = vi.mocked(sessionLogsApi.createSession).mock.calls
    const lastPayload = calls[calls.length - 1][1]
    expect(lastPayload.voiceNoteId).toBe('note-1')
    expect(lastPayload.voiceNoteTranscription).toBe('La sesión fue bien.')
    expect(lastPayload.rawExtractionJson).toBe('{"sessionTitle":"Pretérito perfecto y viajes"}')
  })

  it('does NOT overwrite actualContent when extraction mode is skip', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
      ...EXTRACTED,
      whatWasCovered: { value: 'Repasamos el pretérito perfecto.', mode: 'skip' as const },
    })
    renderLogSession()
    await screen.findByTestId('log-session-page')

    const contentField = screen.getByTestId('actual-content') as HTMLTextAreaElement
    await userEvent.type(contentField, 'Already written.')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La sesión fue bien.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Already written.')
  })

  it('shows extraction error message when extraction fails', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockRejectedValue(new Error('API error'))
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La sesión fue bien.' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('extraction-error')).toBeDefined()
    })
    expect(screen.queryByTestId('extracting-indicator')).toBeNull()
  })

  it('skips extraction when transcription is null', async () => {
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: null })
    })

    expect(sessionLogsApi.extractSessionReflection).not.toHaveBeenCalled()
  })

  it('preserves manually edited sessionDate when extraction provides only time (stale closure fix)', async () => {
    let resolveExtract!: (result: typeof EXTRACTED & { sessionStartTime?: string }) => void
    vi.mocked(sessionLogsApi.extractSessionReflection).mockReturnValue(
      new Promise<typeof EXTRACTED>(resolve => { resolveExtract = resolve as typeof resolveExtract })
    )
    renderLogSession()
    await screen.findByTestId('log-session-page')

    // Start extraction
    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La clase fue a las 10.' })
    })
    expect(screen.getByTestId('extracting-indicator')).toBeDefined()

    // User manually edits date while extraction is in flight
    fireEvent.change(screen.getByTestId('session-date'), { target: { value: '2026-03-15' } })

    // Extraction resolves with a time but no date — without the fix, stale sessionDate from closure would be used
    await act(async () => { resolveExtract({ ...EXTRACTED, sessionStartTime: '10:30' }) })
    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    await waitFor(() => {
      expect(sessionLogsApi.createSession).toHaveBeenCalled()
    })
    const lastPayload = vi.mocked(sessionLogsApi.createSession).mock.calls.slice(-1)[0][1]
    // The save must use the manually entered date, not the stale closure value from extraction start
    expect(lastPayload.sessionDate).toContain('2026-03-15')
  })

  it('preserves manually edited sessionStartTime when extraction provides only date (stale closure fix)', async () => {
    let resolveExtract!: (result: typeof EXTRACTED & { sessionDate?: string }) => void
    vi.mocked(sessionLogsApi.extractSessionReflection).mockReturnValue(
      new Promise<typeof EXTRACTED>(resolve => { resolveExtract = resolve as typeof resolveExtract })
    )
    renderLogSession()
    await screen.findByTestId('log-session-page')

    // Start extraction
    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La clase fue el 15 de enero.' })
    })
    expect(screen.getByTestId('extracting-indicator')).toBeDefined()

    // User manually edits time while extraction is in flight
    fireEvent.change(screen.getByTestId('session-time'), { target: { value: '14:45' } })

    // Extraction resolves with a date but no time
    await act(async () => { resolveExtract({ ...EXTRACTED, sessionDate: '2026-01-15' }) })
    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    await waitFor(() => {
      expect(sessionLogsApi.createSession).toHaveBeenCalled()
    })
    const lastPayload = vi.mocked(sessionLogsApi.createSession).mock.calls.slice(-1)[0][1]
    // The save must use the manually entered time, not the stale closure value from extraction start
    expect(lastPayload.sessionDate).toContain('14:45')
  })

  it('populates date picker from extracted sessionDate', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
      ...EXTRACTED,
      sessionDate: '2026-01-15',
    })
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La clase fue el 15 de enero.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    const dateInput = screen.getByTestId('session-date') as HTMLInputElement
    expect(dateInput.value).toBe('2026-01-15')
  })

  it('populates time picker from extracted sessionStartTime', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
      ...EXTRACTED,
      sessionStartTime: '09:30',
    })
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'La clase fue a las 9 y media.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    const timeInput = screen.getByTestId('session-time') as HTMLInputElement
    expect(timeInput.value).toBe('09:30')
  })

  it('applies extracted durationMinutes when duration is at default', async () => {
    vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
      ...EXTRACTED,
      durationMinutes: 60,
    })
    renderLogSession()
    await screen.findByTestId('log-session-page')

    await act(async () => {
      capturedOnVoiceNote?.({ id: 'note-1', transcription: 'Clase de 60 minutos.' })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('extracting-indicator')).toBeNull()
    })

    expect(screen.getByTestId('duration-select')).toHaveTextContent('60')
  })
})
