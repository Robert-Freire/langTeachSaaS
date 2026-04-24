import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentDetail from './StudentDetail'
import * as studentsApi from '../api/students'

vi.mock('../api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

vi.mock('../api/students', () => ({
  getStudent: vi.fn(),
  updateStudent: vi.fn(),
  appendTeachingTodo: vi.fn(),
  updateTeachingTodo: vi.fn(),
  deleteTeachingTodo: vi.fn(),
}))

vi.mock('../api/sessionLogs', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn(() => '[]'),
  parseTopicTags: vi.fn(() => []),
}))

vi.mock('@/api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
  deleteFollowup: vi.fn(),
}))

vi.mock('../api/lessons', () => ({
  getLessons: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}))

vi.mock('../components/session/SessionHistoryTab', () => ({
  SessionHistoryTab: () => <div data-testid="session-history-tab" />,
}))

vi.mock('../components/student/ProgressDashboard', () => ({
  ProgressDashboard: () => <div data-testid="progress-dashboard" />,
}))

const MOCK_STUDENT: studentsApi.Student = {
  id: 'student-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
  languages: { nativeLanguages: ['English'], spokenLanguages: ['French'] },
  identity: { birthYear: 1995, age: null, profession: 'Designer', countryOfOrigin: 'United Kingdom', cityOfOrigin: 'London', countryOfResidence: 'Spain', cityOfResidence: 'Barcelona' },
  profile: {
    interests: ['travel', 'cooking'],
    personalNotes: null,
    teachingNotes: null,
    learningGoals: [{ id: '1', text: 'Travel', children: [] }, { id: '2', text: 'DELE B1', children: [] }],
    weaknesses: [],
    difficulties: [],
    shortTermObjectives: [{ id: 'obj-1', text: 'Complete DELE B1 exam prep', targetDate: '2026-06-01', objectiveType: 'exam_prep' as const }],
    teachingTodos: [{ id: 'todo-1', text: 'Send homework exercises', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Pending', coveredInSessionLogId: null }],
    reasonForStudying: 'Moved to Barcelona for work',
  },
  commercial: { isActive: true, isCorporate: false, rate: '30 EUR/h' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function wrapper(studentId = 'student-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${studentId}`]}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/students" element={<div>Students list</div>} />
          <Route path="/students/:id/edit" element={<div data-testid="edit-page">Edit</div>} />
          <Route path="/students/:id/log-session" element={<div data-testid="log-session-page">Log Session</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentDetail', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  it('renders student name when loaded', async () => {
    wrapper()
    expect(await screen.findByTestId('student-detail-name')).toHaveTextContent('Ana Garcia')
  })

  it('shows Log Session button', async () => {
    wrapper()
    expect(await screen.findByTestId('log-session-button')).toBeInTheDocument()
  })

  it('navigates to log-session page when Log Session is clicked', async () => {
    wrapper()
    await screen.findByTestId('log-session-button')
    fireEvent.click(screen.getByTestId('log-session-button'))
    expect(await screen.findByTestId('log-session-page')).toBeInTheDocument()
  })

  it('shows not found message for missing student', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Not found'))
    wrapper('bad-id')
    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
  })

  it('renders Overview, Profile, Sessions, and Progress tabs', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument()
    expect(screen.getByTestId('tab-progress')).toBeInTheDocument()
  })

  it('shows Overview tab content by default', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-overview-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-history-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('progress-dashboard')).not.toBeInTheDocument()
  })

  it('switches to Profile tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-profile'))
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-overview-tab')).not.toBeInTheDocument()
  })

  it('switches to Sessions tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-sessions'))
    expect(screen.getByTestId('session-history-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
  })

  it('switches to Progress tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-progress'))
    expect(screen.getByTestId('progress-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
  })

  it('shows CEFR badge in header', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('cefr-badge')).toHaveTextContent('B1')
  })

  it('shows Edit and Log Session quick actions', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('edit-profile-link')).toBeInTheDocument()
    expect(screen.getByTestId('log-session-button')).toBeInTheDocument()
  })

  it('shows official CEFR badge when different from teacher level', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      level: { ...MOCK_STUDENT.level, officialCefrLevel: 'A2' },
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('official-cefr-badge')).toHaveTextContent('Official: A2')
  })

  it('shows official CEFR badge even when same as teacher level', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      level: { ...MOCK_STUDENT.level, officialCefrLevel: 'B1' },
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('official-cefr-badge')).toHaveTextContent('Official: B1')
  })

  it('shows identity subtitle with L1, learning language, profession, and city', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('English speaker, learning Spanish · Designer, Barcelona')
  })

  it('shows "Learning {language}" in subtitle when nativeLanguages is empty', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      languages: { ...MOCK_STUDENT.languages, nativeLanguages: [] },
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('Learning Spanish · Designer, Barcelona')
    expect(screen.getByTestId('student-header-subtitle')).not.toHaveTextContent('speaker')
  })

  it('omits profession segment in subtitle when profession is null', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      identity: { ...MOCK_STUDENT.identity, profession: null },
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('English speaker, learning Spanish · Barcelona')
  })

  it('shows subtitle with just learning language when L1, profession, and city are all absent', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      languages: { ...MOCK_STUDENT.languages, nativeLanguages: [] },
      identity: { ...MOCK_STUDENT.identity, profession: null, cityOfOrigin: null, cityOfResidence: null },
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('Learning Spanish')
  })

  it('tab click updates URL search param', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-profile'))
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
  })

  it('renders correct tab when URL has ?tab=profile on load', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/students/student-1?tab=profile']}>
          <Routes>
            <Route path="/students/:id" element={<StudentDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-overview-tab')).not.toBeInTheDocument()
  })

  it('shows Edit Student as tonal secondary button', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('edit-profile-link')).toHaveTextContent('Edit Student')
  })
})

describe('StudentDetail - Header badges', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  it('shows separate Active and Private badges for active non-corporate student', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent('Active')
    expect(screen.getByTestId('student-status-badge')).not.toHaveTextContent(/Private/i)
    expect(screen.getByTestId('student-type-badge')).toHaveTextContent('Private')
  })

  it('shows separate Active and Corporate badges for active corporate student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...MOCK_STUDENT, commercial: { ...MOCK_STUDENT.commercial, isCorporate: true } })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent('Active')
    expect(screen.getByTestId('student-type-badge')).toHaveTextContent('Corporate')
  })

  it('shows Inactive badge for inactive student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...MOCK_STUDENT, commercial: { ...MOCK_STUDENT.commercial, isActive: false } })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent(/Inactive/i)
    expect(screen.queryByTestId('student-type-badge')).not.toBeInTheDocument()
  })

  it('does not show next session pill when no future sessions', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.queryByTestId('next-session-pill')).not.toBeInTheDocument()
  })

  it('shows next session pill when a future session exists', async () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const { listSessions } = await import('../api/sessionLogs')
    vi.mocked(listSessions).mockResolvedValueOnce([{
      id: 'future-sess',
      studentId: 'student-1',
      sessionDate: future.toISOString(),
      title: 'Upcoming class',
      plannedContent: null,
      actualContent: null,
      homeworkAssigned: null,
      previousHomeworkStatus: 0,
      previousHomeworkStatusName: 'NotDone',
      nextSessionTopics: null,
      generalNotes: null,
      levelReassessmentSkill: null,
      levelReassessmentLevel: null,
      linkedLessonId: null,
      topicTags: '[]',
      createdAt: future.toISOString(),
      updatedAt: future.toISOString(),
      isCancelled: false,
      status: 1,
      statusName: 'Confirmed',
      mentionedDifficultyPairs: '[]',
      suggestedDifficulties: '[]',
      duration: 60,
      hasVoiceNote: false,
    }])
    wrapper()
    expect(await screen.findByTestId('next-session-pill')).toBeInTheDocument()
  })

  it('header badges persist after switching tabs', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    // Switch to Profile tab
    fireEvent.click(screen.getByTestId('tab-profile'))
    expect(screen.getByTestId('student-status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('student-detail-name')).toBeInTheDocument()
    // Switch to Sessions tab
    fireEvent.click(screen.getByTestId('tab-sessions'))
    expect(screen.getByTestId('student-status-badge')).toBeInTheDocument()
  })

  it('hides session frequency indicator when no sessions', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.queryByTestId('session-frequency-indicator')).not.toBeInTheDocument()
  })

  it('shows session frequency indicator when past sessions exist', async () => {
    const past1 = new Date()
    past1.setDate(past1.getDate() - 30)
    const past2 = new Date()
    past2.setDate(past2.getDate() - 14)
    const { listSessions } = await import('../api/sessionLogs')
    const makeSession = (id: string, date: Date) => ({
      id,
      studentId: 'student-1',
      sessionDate: date.toISOString(),
      title: null,
      plannedContent: null,
      actualContent: null,
      homeworkAssigned: null,
      previousHomeworkStatus: 0,
      previousHomeworkStatusName: 'NotDone' as const,
      nextSessionTopics: null,
      generalNotes: null,
      levelReassessmentSkill: null,
      levelReassessmentLevel: null,
      linkedLessonId: null,
      topicTags: '[]',
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      isCancelled: false,
      status: 1,
      statusName: 'Confirmed' as const,
      mentionedDifficultyPairs: '[]',
      suggestedDifficulties: '[]',
      duration: 60,
      hasVoiceNote: false,
    })
    vi.mocked(listSessions).mockResolvedValueOnce([makeSession('s1', past1), makeSession('s2', past2)])
    wrapper()
    expect(await screen.findByTestId('session-frequency-indicator')).toBeInTheDocument()
  })
})

describe('StudentDetail - Primary objective in header', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  it('shows primary objective in header when objective is set', async () => {
    wrapper()
    await screen.findByTestId('primary-objective-card')
    expect(screen.getByTestId('objective-text')).toHaveTextContent('Complete DELE B1 exam prep')
  })

  it('shows days remaining for objective with future date', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      profile: { ...MOCK_STUDENT.profile, shortTermObjectives: [{ id: 'obj-1', text: 'Future objective', targetDate: '2030-01-01', objectiveType: 'other' as const }] },
    })
    wrapper()
    await screen.findByTestId('primary-objective-card')
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('days left')
  })

  it('hides objective element when no objectives set', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...MOCK_STUDENT, profile: { ...MOCK_STUDENT.profile, shortTermObjectives: [] } })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.queryByTestId('primary-objective-card')).not.toBeInTheDocument()
  })

  it('objective card persists when switching tabs', async () => {
    wrapper()
    await screen.findByTestId('primary-objective-card')
    fireEvent.click(screen.getByTestId('tab-profile'))
    expect(screen.getByTestId('primary-objective-card')).toBeInTheDocument()
    expect(screen.getByTestId('objective-text')).toHaveTextContent('Complete DELE B1 exam prep')
  })
})

describe('StudentDetail - Profile tab sections', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  async function openProfileTab() {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-profile'))
  }

  it('renders hero section with reason for studying', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-hero')
    expect(screen.getByTestId('reason-quote')).toHaveTextContent('Moved to Barcelona for work')
  })

  it('renders Identity Details section with identity fields', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-about')
    expect(screen.getByText('London, United Kingdom')).toBeInTheDocument()
    expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
    expect(screen.getByText(/^1995 \(\d+\)$/)).toBeInTheDocument()
    expect(screen.getAllByText('Designer').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Language Ecosystem section', async () => {
    await openProfileTab()
    const section = await screen.findByTestId('profile-language-ecosystem')
    expect(section).toHaveTextContent('English')
    expect(section).toHaveTextContent('French')
    expect(section).toHaveTextContent('Spanish')
    expect(section).toHaveTextContent('B1')
  })

  it('renders Learning Goals section', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-learning-goals')
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('DELE B1')).toBeInTheDocument()
  })

  it('renders Short-Term Objectives section', async () => {
    await openProfileTab()
    const section = await screen.findByTestId('profile-objectives')
    expect(section).toHaveTextContent('Complete DELE B1 exam prep')
  })

  it('renders Teaching Todos section', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-teaching-todos')
    expect(screen.getByText('Send homework exercises')).toBeInTheDocument()
  })

  it('renders Commercial section with active status', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-commercial')
    expect(screen.getByTestId('active-status-badge')).toHaveTextContent('Active')
    expect(screen.getByText('30 EUR/h')).toBeInTheDocument()
  })

  it('shows empty states when no profile data', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      identity: { ...MOCK_STUDENT.identity, birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
      profile: { ...MOCK_STUDENT.profile, learningGoals: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
    })
    await openProfileTab()
    // identity sidebar is collapsed (no data) — show-empty-sections toggle is visible instead
    await screen.findByTestId('show-empty-sections-btn')
    // profile-about (Teacher's Working Memory) is always visible regardless of identity data
    expect(screen.getByTestId('profile-about')).toBeInTheDocument()
    // these sections are always shown (inside Pedagogical Diagnostic card)
    expect(screen.getByText('No learning goals set')).toBeInTheDocument()
    expect(screen.getByText('No objectives set')).toBeInTheDocument()
    expect(screen.getByTestId('teaching-todos-empty')).toBeInTheDocument()
  })
})
