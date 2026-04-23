import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
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


const BASE_STUDENT: Student = {
  id: 'student-1',
  name: 'Ana García',
  learningLanguage: 'Spanish',
  level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
  languages: { nativeLanguages: ['English'], spokenLanguages: [] },
  identity: { birthYear: null, age: null, profession: 'Designer', countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null, reasonForStudying: 'Moving to Spain next year' },
  profile: { interests: ['reading', 'travel'], personalNotes: null, teachingNotes: null, learningGoals: [{ id: '1', text: 'Conversational fluency', children: [] }], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [] },
  commercial: { isActive: true, isCorporate: false, rate: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderOverview(student: Student, sessions?: SessionLog[], followups?: import('@/api/followups').TeacherFollowup[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>
          <StudentOverviewTab student={student} sessions={sessions} followups={followups} onStudentChange={() => {}} />
        </MemoryRouter>
      </TooltipProvider>
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
    renderOverview({ ...BASE_STUDENT, level: { ...BASE_STUDENT.level, skillLevelOverrides: {} } })
    expect(screen.getByTestId('pedagogical-profile-card')).toBeInTheDocument()
    expect(screen.getByTestId('pedagogical-profile-empty')).toBeInTheDocument()
  })

  it('renders skill bars for each override', () => {
    const student = {
      ...BASE_STUDENT,
      level: { ...BASE_STUDENT.level, skillLevelOverrides: { Reading: 'B2', Writing: 'A2' } },
    }
    renderOverview(student)
    expect(screen.getByTestId('skill-bars')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-Reading')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-Writing')).toBeInTheDocument()
    expect(screen.getAllByText('B2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('A2').length).toBeGreaterThanOrEqual(1)
  })

  it('renders native language tags with L- prefix', () => {
    const student = {
      ...BASE_STUDENT,
      languages: { ...BASE_STUDENT.languages, nativeLanguages: ['English', 'French'] },
    }
    renderOverview(student)
    const tagsSection = screen.getByTestId('language-tags')
    expect(tagsSection).toHaveTextContent('L-ENGLISH')
    expect(tagsSection).toHaveTextContent('L-FRENCH')
  })

  it('always renders language tag row with target language', () => {
    renderOverview({ ...BASE_STUDENT, languages: { ...BASE_STUDENT.languages, nativeLanguages: [] } })
    const tagsSection = screen.getByTestId('language-tags')
    expect(tagsSection).toHaveTextContent('T-SPANISH')
  })

  it('renders target language tag alongside native tags', () => {
    const student = { ...BASE_STUDENT, languages: { ...BASE_STUDENT.languages, nativeLanguages: ['Ukrainian'] }, learningLanguage: 'Spanish' }
    renderOverview(student)
    const tagsSection = screen.getByTestId('language-tags')
    expect(tagsSection).toHaveTextContent('L-UKRAINIAN')
    expect(tagsSection).toHaveTextContent('T-SPANISH')
  })

  it('shows tooltip explaining target language on hover', async () => {
    const user = userEvent.setup()
    renderOverview({ ...BASE_STUDENT, learningLanguage: 'Spanish' })
    const tag = screen.getByTestId('target-language-tag')
    await user.hover(tag)
    expect(await screen.findByText(/target language.*spanish/i)).toBeInTheDocument()
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

  it('shows homework chip when set', () => {
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

  it('limits to 2 sessions', () => {
    const sessions: SessionLog[] = [1, 2, 3, 4].map((i) => ({
      ...MOCK_SESSION,
      id: `sess-${i}`,
      sessionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      title: `Session ${i}`,
    }))
    renderOverview(BASE_STUDENT, sessions)
    expect(screen.getAllByTestId('recent-session-item').length).toBe(2)
  })

  it('synthesizes title from narrative when title is blank', () => {
    const session = { ...MOCK_SESSION, title: null, actualContent: 'Practised pretérito indefinido with travel narrative' }
    renderOverview(BASE_STUDENT, [session])
    expect(screen.getByTestId('compact-session-title')).toHaveTextContent('Practised pretérito indefinido')
  })

  it('synthesizes title from narrative when title is generic Session', () => {
    const session = { ...MOCK_SESSION, title: 'Session', actualContent: 'Review of irregular verbs' }
    renderOverview(BASE_STUDENT, [session])
    expect(screen.getByTestId('compact-session-title')).toHaveTextContent('Review of irregular verbs')
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
    renderOverview({ ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, teachingNotes: null } })
    expect(screen.getByTestId('teaching-notes-empty')).toBeInTheDocument()
  })

  it('shows teaching notes text when set', () => {
    const student = { ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, teachingNotes: 'Prefers visual examples' } }
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

// ---------------------------------------------------------------------------
// Card layout and conditional styling
// ---------------------------------------------------------------------------

describe('StudentOverviewTab - card order and conditional styling', () => {
  it('renders Followups card before Profile card before Ideas card', () => {
    renderOverview(BASE_STUDENT)
    const row = screen.getByTestId('three-card-row')
    const followups = row.querySelector('[data-testid="followups-card-wrapper"]')
    const profile = row.querySelector('[data-testid="pedagogical-profile-card"]')
    const ideas = row.querySelector('[data-testid="ideas-card-wrapper"]')
    expect(followups).toBeInTheDocument()
    expect(profile).toBeInTheDocument()
    expect(ideas).toBeInTheDocument()
    // Verify DOM order: followups comes first, then profile, then ideas
    const children = Array.from(row.children)
    expect(children.indexOf(followups!)).toBeLessThan(children.indexOf(profile!))
    expect(children.indexOf(profile!)).toBeLessThan(children.indexOf(ideas!))
  })

  it('Followups card has neutral background when no pending followups', () => {
    renderOverview(BASE_STUDENT, [], [])
    const wrapper = screen.getByTestId('followups-card-wrapper')
    expect(wrapper.className).toContain('bg-white')
    expect(wrapper.className).not.toContain('FFF9F2')
  })

  it('Followups card has amber background when pending followups exist', () => {
    const pendingFollowup = { id: 'f1', text: 'Prepare vocabulary list', status: 'pending' as const, studentId: 'student-1', studentName: null, createdAt: new Date().toISOString(), dueDate: null, completedAt: null, sourceSessionLogId: null }
    renderOverview(BASE_STUDENT, [], [pendingFollowup])
    const wrapper = screen.getByTestId('followups-card-wrapper')
    expect(wrapper.className).toContain('FFF9F2')
  })

  it('Ideas card has muted background when no todos', () => {
    renderOverview({ ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, teachingTodos: [] } })
    const wrapper = screen.getByTestId('ideas-card-wrapper')
    expect(wrapper.className).toContain('F4F2FD')
  })

  it('Ideas card has white background when todos exist', () => {
    const student = {
      ...BASE_STUDENT,
      profile: { ...BASE_STUDENT.profile, teachingTodos: [{ id: 't1', text: 'Practice past tense', status: 'pending', createdAt: new Date().toISOString(), sourceSessionLogId: null, coveredInSessionLogId: null }] },
    }
    renderOverview(student)
    const wrapper = screen.getByTestId('ideas-card-wrapper')
    expect(wrapper.className).toContain('bg-white')
  })
})

// ---------------------------------------------------------------------------
// Rotating prompts
// ---------------------------------------------------------------------------

describe('StudentOverviewTab - rotating empty-state prompts', () => {
  it('shows rotating prompt for Pedagogical Profile when no overrides, difficulties, or goals', () => {
    const student = {
      ...BASE_STUDENT,
      level: { ...BASE_STUDENT.level, skillLevelOverrides: {} },
      profile: { ...BASE_STUDENT.profile, difficulties: [], learningGoals: [] },
    }
    renderOverview(student)
    expect(screen.getByTestId('pedagogical-profile-rotating-prompt')).toBeInTheDocument()
  })

  it('shows active difficulties instead of rotating prompt when present', () => {
    const student = {
      ...BASE_STUDENT,
      level: { ...BASE_STUDENT.level, skillLevelOverrides: {} },
      profile: { ...BASE_STUDENT.profile, difficulties: [{ id: 'd1', description: 'Pretérito vs imperfecto', competency: 'Grammar', subcategory: '', severity: 'Medium', trend: 'Stable', status: 'Active' }], learningGoals: [] },
    }
    renderOverview(student)
    expect(screen.queryByTestId('pedagogical-profile-rotating-prompt')).not.toBeInTheDocument()
    expect(screen.getByTestId('pedagogical-profile-empty')).toHaveTextContent('Pretérito vs imperfecto')
  })

  it('shows rotating prompt for Ideas when no todos', () => {
    renderOverview({ ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, teachingTodos: [] } })
    expect(screen.getByTestId('ideas-rotating-prompt')).toBeInTheDocument()
  })

  it('hides rotating prompt for Ideas when todos exist', () => {
    const student = {
      ...BASE_STUDENT,
      profile: { ...BASE_STUDENT.profile, teachingTodos: [{ id: 't1', text: 'Practice something', status: 'pending', createdAt: new Date().toISOString(), sourceSessionLogId: null, coveredInSessionLogId: null }] },
    }
    renderOverview(student)
    expect(screen.queryByTestId('ideas-rotating-prompt')).not.toBeInTheDocument()
  })
})
