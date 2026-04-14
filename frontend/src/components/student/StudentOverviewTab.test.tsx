import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentOverviewTab } from './StudentOverviewTab'
import type { Student } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'

vi.mock('@/api/followups', () => ({
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

vi.mock('@/api/students', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/students')>()
  return {
    ...actual,
    appendTeachingTodo: vi.fn(),
    updateTeachingTodo: vi.fn(),
    deleteTeachingTodo: vi.fn(),
    updateStudent: vi.fn(),
  }
})

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const BASE_STUDENT: Student = {
  id: 'student-1',
  name: 'Ana García',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: ['reading', 'travel'],
  personalNotes: null,
  teachingNotes: null,
  nativeLanguages: ['English'],
  learningGoals: [{ id: '1', text: 'Conversational fluency', children: [] }],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: null,
  profession: 'Designer',
  countryOfOrigin: null,
  cityOfOrigin: null,
  countryOfResidence: null,
  cityOfResidence: null,
  reasonForStudying: 'Moving to Spain next year',
  officialCefrLevel: null,
  shortTermObjectives: [],
  isActive: true,
  isCorporate: false,
  rate: null,
  spokenLanguages: [],
  teachingTodos: [],
  skillLevelOverrides: {},
}

function renderOverview(student: Student, sessions?: SessionLog[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StudentOverviewTab student={student} sessions={sessions} onStudentChange={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentOverviewTab', () => {
  it('renders overview tab', () => {
    renderOverview(BASE_STUDENT)
    expect(screen.getByTestId('student-overview-tab')).toBeInTheDocument()
  })

})

// ---------------------------------------------------------------------------
// Pedagogical Profile card
// ---------------------------------------------------------------------------

describe('StudentOverviewTab - PedagogicalProfileCard', () => {
  it('shows empty state when no skill overrides', () => {
    renderOverview({ ...BASE_STUDENT, skillLevelOverrides: {} })
    expect(screen.getByTestId('pedagogical-profile-card')).toBeInTheDocument()
    expect(screen.getByTestId('pedagogical-profile-empty')).toBeInTheDocument()
  })

  it('renders skill bars for each override', () => {
    const student = {
      ...BASE_STUDENT,
      skillLevelOverrides: { Reading: 'B2', Writing: 'A2' },
    }
    renderOverview(student)
    expect(screen.getByTestId('skill-bars')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-Reading')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-Writing')).toBeInTheDocument()
    expect(screen.getAllByText('B2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('A2').length).toBeGreaterThanOrEqual(1)
  })

  it('renders native language tags', () => {
    const student = {
      ...BASE_STUDENT,
      nativeLanguages: ['English', 'French'],
    }
    renderOverview(student)
    const tagsSection = screen.getByTestId('native-language-tags')
    expect(tagsSection).toHaveTextContent('English')
    expect(tagsSection).toHaveTextContent('French')
  })

  it('does not render native language tags when empty', () => {
    renderOverview({ ...BASE_STUDENT, nativeLanguages: [] })
    expect(screen.queryByTestId('native-language-tags')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Recent Sessions
// ---------------------------------------------------------------------------

const PAST_DATE = new Date()
PAST_DATE.setDate(PAST_DATE.getDate() - 7)
const PAST_DATE_2 = new Date()
PAST_DATE_2.setDate(PAST_DATE_2.getDate() - 14)

const MOCK_SESSION: SessionLog = {
  id: 'sess-1',
  studentId: 'student-1',
  sessionDate: PAST_DATE.toISOString(),
  title: 'Vocabulary: Travel',
  plannedContent: null,
  actualContent: 'We covered travel vocabulary in detail',
  homeworkAssigned: 'Write 5 sentences',
  previousHomeworkStatus: 0,
  previousHomeworkStatusName: 'NotDone',
  nextSessionTopics: null,
  generalNotes: null,
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
  topicTags: JSON.stringify([{ tag: 'VOCABULARY' }, { tag: 'TRAVEL' }]),
  createdAt: PAST_DATE.toISOString(),
  updatedAt: PAST_DATE.toISOString(),
  isCancelled: false,
  status: 1,
  statusName: 'Confirmed',
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  duration: 60,
  hasVoiceNote: false,
}

describe('StudentOverviewTab - RecentSessions', () => {
  it('shows empty state when no sessions', () => {
    renderOverview(BASE_STUDENT, [])
    expect(screen.getByTestId('recent-sessions-empty')).toBeInTheDocument()
  })

  it('renders a session item when sessions are passed', () => {
    renderOverview(BASE_STUDENT, [MOCK_SESSION])
    expect(screen.getAllByTestId('recent-session-item').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Vocabulary: Travel')).toBeInTheDocument()
  })

  it('shows session narrative snippet', () => {
    renderOverview(BASE_STUDENT, [MOCK_SESSION])
    expect(screen.getByText('We covered travel vocabulary in detail')).toBeInTheDocument()
  })

  it('shows homework when set', () => {
    renderOverview(BASE_STUDENT, [MOCK_SESSION])
    expect(screen.getByText(/Write 5 sentences/)).toBeInTheDocument()
  })

  it('shows duration', () => {
    renderOverview(BASE_STUDENT, [MOCK_SESSION])
    expect(screen.getByText('60min')).toBeInTheDocument()
  })

  it('shows view all sessions button and calls callback', () => {
    const onViewAll = vi.fn()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StudentOverviewTab
            student={BASE_STUDENT}
            sessions={[MOCK_SESSION]}
            onStudentChange={() => {}}
            onViewAllSessions={onViewAll}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByTestId('view-all-sessions-btn'))
    expect(onViewAll).toHaveBeenCalled()
  })

  it('limits to 3 sessions', () => {
    const sessions: SessionLog[] = [1, 2, 3, 4].map((i) => ({
      ...MOCK_SESSION,
      id: `sess-${i}`,
      sessionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      title: `Session ${i}`,
    }))
    renderOverview(BASE_STUDENT, sessions)
    expect(screen.getAllByTestId('recent-session-item').length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Teacher's Working Memory panel
// ---------------------------------------------------------------------------

describe('StudentOverviewTab - TeachingNotesPanel', () => {
  it('renders the panel', () => {
    renderOverview(BASE_STUDENT)
    expect(screen.getByTestId('teaching-notes-panel')).toBeInTheDocument()
  })

  it('shows empty state when no teaching notes', () => {
    renderOverview({ ...BASE_STUDENT, teachingNotes: null })
    expect(screen.getByTestId('teaching-notes-empty')).toBeInTheDocument()
  })

  it('shows teaching notes text when set', () => {
    const student = { ...BASE_STUDENT, teachingNotes: 'Prefers visual examples' }
    renderOverview(student)
    expect(screen.getByTestId('teaching-notes-text')).toHaveTextContent('Prefers visual examples')
  })

  it('shows Add Memory button when onSaveTeachingNotes is provided', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StudentOverviewTab student={BASE_STUDENT} onStudentChange={() => {}} onSaveTeachingNotes={vi.fn().mockResolvedValue(undefined)} />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByTestId('add-memory-btn')).toBeInTheDocument()
  })

  it('hides Add Memory button when onSaveTeachingNotes is not provided', () => {
    renderOverview(BASE_STUDENT)
    expect(screen.queryByTestId('add-memory-btn')).not.toBeInTheDocument()
  })

  it('shows textarea when Add Memory is clicked', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StudentOverviewTab student={BASE_STUDENT} onStudentChange={() => {}} onSaveTeachingNotes={vi.fn().mockResolvedValue(undefined)} />
        </MemoryRouter>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByTestId('add-memory-btn'))
    expect(screen.getByTestId('teaching-notes-textarea')).toBeInTheDocument()
  })

  it('hides textarea when Cancel is clicked', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StudentOverviewTab student={BASE_STUDENT} onStudentChange={() => {}} onSaveTeachingNotes={vi.fn().mockResolvedValue(undefined)} />
        </MemoryRouter>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByTestId('add-memory-btn'))
    expect(screen.getByTestId('teaching-notes-textarea')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('teaching-notes-cancel-btn'))
    expect(screen.queryByTestId('teaching-notes-textarea')).not.toBeInTheDocument()
  })

  it('shows Student Since date from createdAt', () => {
    renderOverview({ ...BASE_STUDENT, createdAt: '2026-01-01T00:00:00Z' })
    expect(screen.getByTestId('student-since')).toHaveTextContent('Jan 2026')
  })
})
